// Supabase Edge Function: agent-admin
// ─────────────────────────────────────────────────────────────────────────────
// Agente Administrativo (Dados Reais do Banco - Sem IA)
// Consulta o banco Supabase e retorna métricas de negócio: assinaturas,
// faturamento, retenção e produtos mais populares.
// NÃO usa Gemini - usa queries SQL diretas (mais barato e mais preciso).
// 
// Para publicar: supabase functions deploy agent-admin
// ATENÇÃO: Esta função requer autenticação de admin. Não usar --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Verificar se quem chama é admin (via JWT com role='admin' ou email específico)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado. Esta função requer autenticação de administrador.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await callerClient.auth.getUser();
    const ADMIN_EMAILS = ['viroedu@gmail.com']; // Adicione outros admins aqui
    if (!userData?.user?.email || !ADMIN_EMAILS.includes(userData.user.email.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores podem acessar este relatório.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── MÉTRICAS DE ASSINATURAS ───────────────────────────────────────────
    const { data: profiles, error: profilesErr } = await adminClient
      .from('profiles')
      .select('subscription_plan, subscription_expires_at, created_at');

    if (profilesErr) throw new Error(`Erro ao buscar profiles: ${profilesErr.message}`);

    const now = new Date();
    let totalUsers = profiles?.length || 0;
    let premiumActive = 0;
    let premiumExpired = 0;
    let freeUsers = 0;
    let influencerUsers = 0;
    let newUsersThisMonth = 0;

    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    profiles?.forEach(p => {
      const plan = p.subscription_plan || 'free';
      const expiresAt = p.subscription_expires_at ? new Date(p.subscription_expires_at) : null;
      const isActive = !expiresAt || expiresAt > now;

      if (plan === 'premium') {
        if (isActive) premiumActive++;
        else premiumExpired++;
      } else if (plan === 'influencer') {
        influencerUsers++;
      } else {
        freeUsers++;
      }

      if (p.created_at && new Date(p.created_at) >= firstDayOfMonth) {
        newUsersThisMonth++;
      }
    });

    // ─── MÉTRICAS DE SCANS / ANÁLISES ─────────────────────────────────────
    const { count: totalScans } = await adminClient
      .from('skin_scans')
      .select('*', { count: 'exact', head: true });

    const { count: scansThisMonth } = await adminClient
      .from('skin_scans')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', firstDayOfMonth.toISOString());

    // ─── PRODUTOS MAIS ADICIONADOS AO ARMÁRIO ─────────────────────────────
    const { data: userProducts } = await adminClient
      .from('user_products')
      .select('custom_name, custom_brand');

    const productCounts: Record<string, number> = {};
    userProducts?.forEach(up => {
      const key = `${up.custom_name} (${up.custom_brand || 'Sem marca'})`;
      productCounts[key] = (productCounts[key] || 0) + 1;
    });

    const topProducts = Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // ─── RETORNO ───────────────────────────────────────────────────────────
    const report = {
      generated_at: now.toISOString(),
      users: {
        total: totalUsers,
        new_this_month: newUsersThisMonth,
        premium_active: premiumActive,
        premium_expired: premiumExpired,
        free: freeUsers,
        influencer: influencerUsers,
        conversion_rate_percent: totalUsers > 0 ? Math.round((premiumActive / totalUsers) * 100) : 0
      },
      scans: {
        total: totalScans || 0,
        this_month: scansThisMonth || 0
      },
      top_products: topProducts
    };

    return new Response(JSON.stringify(report), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro interno';
    console.error('[agent-admin] Erro:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

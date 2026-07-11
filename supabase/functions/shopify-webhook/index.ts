// Supabase Edge Function: shopify-webhook
// Recebe o webhook orders/paid do Shopify e concede acesso ao VisCare.
//
// Variáveis de ambiente necessárias (Supabase → Settings → Edge Functions → Secrets):
//   SHOPIFY_WEBHOOK_SECRET  — chave HMAC do webhook (Shopify → Settings → Notifications → Webhooks)
//
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetadas automaticamente pelo Supabase.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const WEBHOOK_SECRET     = Deno.env.get('SHOPIFY_WEBHOOK_SECRET') || '';
const SUPABASE_URL       = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Verifica a assinatura HMAC-SHA256 enviada pelo Shopify
async function verifyHmac(body: string, hmacHeader: string): Promise<boolean> {
  if (!WEBHOOK_SECRET) return true; // sem secret configurado: aceita (só em dev)
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return expected === hmacHeader;
}

// Determina o plano pelo título/SKU do item
function detectPlan(title: string, sku: string): 'topup' | 'monthly' | null {
  const text = (title + ' ' + sku).toLowerCase();
  if (text.includes('topup') || text.includes('avulso') || text.includes('pacote')) return 'topup';
  if (text.includes('monthly') || text.includes('mensal') || text.includes('premium')) return 'monthly';
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const body = await req.text();
  const hmac = req.headers.get('X-Shopify-Hmac-Sha256') || '';

  if (!(await verifyHmac(body, hmac))) {
    console.error('[shopify-webhook] Assinatura HMAC inválida');
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const order = JSON.parse(body);
    const customerEmail: string = (order.customer?.email || order.email || '').toLowerCase().trim();

    if (!customerEmail) {
      return new Response(JSON.stringify({ error: 'E-mail do cliente ausente no pedido.' }), { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);

    // Busca o ID do usuário VisCare pelo e-mail
    const { data: userId, error: rpcError } = await supabase
      .rpc('get_user_id_by_email', { user_email: customerEmail });

    if (rpcError || !userId) {
      // Usuário ainda não tem conta — registra para análise manual
      console.warn(`[shopify-webhook] Usuário ${customerEmail} não encontrado no VisCare. Pedido: ${order.id}`);
      return new Response(JSON.stringify({ ok: true, note: 'Usuário não encontrado; acesso pendente.' }), { status: 200 });
    }

    // Processa cada item do pedido
    for (const item of (order.line_items || [])) {
      const plan = detectPlan(item.title || '', item.sku || '');
      if (!plan) continue;

      if (plan === 'topup') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('topup_scans, topup_searches')
          .eq('id', userId)
          .single();

        await supabase.from('profiles').update({
          topup_scans:    (profile?.topup_scans    ?? 0) + 2,
          topup_searches: (profile?.topup_searches ?? 0) + 3,
        }).eq('id', userId);

        console.log(`[shopify-webhook] Pacote Avulso concedido para ${customerEmail}`);

      } else if (plan === 'monthly') {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await supabase.from('profiles').update({
          subscription_plan:       'premium',
          subscription_expires_at: expiresAt.toISOString(),
        }).eq('id', userId);

        console.log(`[shopify-webhook] Premium Mensal concedido para ${customerEmail} até ${expiresAt.toISOString()}`);
      }
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro interno';
    console.error('[shopify-webhook] Erro:', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
});

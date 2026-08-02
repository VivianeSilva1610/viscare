// Supabase Edge Function: create-pix-payment
// ─────────────────────────────────────────────────────────────────────────────
// Gera uma cobrança Pix via Asaas (asaas.com) e devolve o QR Code + código
// copia-e-cola pro client exibir. Espelha o padrão do create-payment-intent
// (Stripe): a chave secreta do Asaas só existe aqui no servidor.
//
// Plano "topup"   → um pagamento avulso via Pix.
// Plano "monthly" → uma assinatura Asaas (billingType PIX, ciclo mensal); o
// Asaas gera automaticamente uma nova cobrança Pix a cada ciclo, e é o
// asaas-webhook quem concede a renovação a cada confirmação.
//
// Quem de fato libera Premium/créditos é o asaas-webhook, com o pagamento já
// confirmado — esta função só cria a cobrança e devolve os dados pro usuário
// pagar; nada é liberado aqui.
//
// Para publicar:
//   supabase functions deploy create-pix-payment --no-verify-jwt
//
// Configurar no painel Supabase (Settings → Edge Functions → Environment variables):
//   ASAAS_KEY_SECRET = sua chave de API do Asaas (produção ou sandbox)
//   ASAAS_API_URL    = https://api.asaas.com/v3 (produção) ou
//                      https://sandbox.asaas.com/api/v3 (sandbox)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Preços em reais — mantenha sincronizado com FIXED_LOCAL_PRICES em
// src/services/paymentService.ts e com PRICES_CENTS.BRL em create-payment-intent.
const PRICE_BRL: Record<string, number> = {
  topup: 34.90,
  monthly: 24.90,
};

function todayISO(): string {
  // Data no fuso de São Paulo, formato YYYY-MM-DD exigido pelo Asaas.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const asaasApiKey = Deno.env.get('ASAAS_KEY_SECRET') || Deno.env.get('ASAAS_API_KEY');
    const asaasApiUrl = Deno.env.get('ASAAS_API_URL') || 'https://api.asaas.com/v3';
    if (!asaasApiKey) {
      return new Response(
        JSON.stringify({ error: 'Asaas não configurado no servidor. Adicione ASAAS_KEY_SECRET nas variáveis de ambiente do Supabase.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, plan } = await req.json();
    if (!userId || (plan !== 'topup' && plan !== 'monthly')) {
      return new Response(
        JSON.stringify({ error: 'userId e plan (topup|monthly) são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('email, asaas_customer_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Perfil não encontrado.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const asaasHeaders = {
      'Content-Type': 'application/json',
      'access_token': asaasApiKey,
    };

    // 1. Garante um customer no Asaas (reaproveita se já existir).
    let customerId = profile.asaas_customer_id as string | null;
    if (!customerId) {
      const customerResp = await fetch(`${asaasApiUrl}/customers`, {
        method: 'POST',
        headers: asaasHeaders,
        body: JSON.stringify({
          name: profile.email.split('@')[0],
          email: profile.email,
          externalReference: userId,
        }),
      });
      const customerData = await customerResp.json();
      if (!customerResp.ok) {
        console.error('[create-pix-payment] Erro ao criar customer Asaas:', customerData);
        return new Response(
          JSON.stringify({ error: customerData?.errors?.[0]?.description || 'Erro ao criar cliente no Asaas.' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      customerId = customerData.id;
      await adminClient.from('profiles').update({ asaas_customer_id: customerId }).eq('id', userId);
    }

    const value = PRICE_BRL[plan];
    const dueDate = todayISO();
    const externalReference = `${userId}:${plan}`;
    let paymentId: string;

    if (plan === 'monthly') {
      const subResp = await fetch(`${asaasApiUrl}/subscriptions`, {
        method: 'POST',
        headers: asaasHeaders,
        body: JSON.stringify({
          customer: customerId,
          billingType: 'PIX',
          value,
          nextDueDate: dueDate,
          cycle: 'MONTHLY',
          description: 'Viscare Premium Mensal — Tudo ilimitado, renovação automática',
          externalReference,
        }),
      });
      const subData = await subResp.json();
      if (!subResp.ok) {
        console.error('[create-pix-payment] Erro ao criar subscription Asaas:', subData);
        return new Response(
          JSON.stringify({ error: subData?.errors?.[0]?.description || 'Erro ao criar assinatura no Asaas.' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      await adminClient.from('profiles').update({ asaas_subscription_id: subData.id }).eq('id', userId);

      // A cobrança Pix do primeiro ciclo é gerada de forma assíncrona pelo
      // Asaas; consulta com pequenas tentativas até aparecer.
      let firstPayment: any = null;
      for (let attempt = 0; attempt < 5 && !firstPayment; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, 1000));
        const paymentsResp = await fetch(`${asaasApiUrl}/payments?subscription=${subData.id}&limit=1`, { headers: asaasHeaders });
        const paymentsData = await paymentsResp.json();
        firstPayment = paymentsData?.data?.[0] || null;
      }
      if (!firstPayment) {
        return new Response(
          JSON.stringify({ error: 'Assinatura criada, mas a cobrança Pix ainda não foi gerada. Tente novamente em instantes.' }),
          { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      paymentId = firstPayment.id;
    } else {
      const paymentResp = await fetch(`${asaasApiUrl}/payments`, {
        method: 'POST',
        headers: asaasHeaders,
        body: JSON.stringify({
          customer: customerId,
          billingType: 'PIX',
          value,
          dueDate,
          description: 'Viscare — Pacote Avulso (+2 análises +3 explorações)',
          externalReference,
        }),
      });
      const paymentData = await paymentResp.json();
      if (!paymentResp.ok) {
        console.error('[create-pix-payment] Erro ao criar payment Asaas:', paymentData);
        return new Response(
          JSON.stringify({ error: paymentData?.errors?.[0]?.description || 'Erro ao criar cobrança no Asaas.' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      paymentId = paymentData.id;
    }

    // 2. Busca o QR Code Pix da cobrança criada.
    const qrResp = await fetch(`${asaasApiUrl}/payments/${paymentId}/pixQrCode`, { headers: asaasHeaders });
    const qrData = await qrResp.json();
    if (!qrResp.ok) {
      console.error('[create-pix-payment] Erro ao buscar QR Code Pix:', qrData);
      return new Response(
        JSON.stringify({ error: 'Cobrança criada, mas houve erro ao gerar o QR Code Pix.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        paymentId,
        qrCodeBase64: qrData.encodedImage,
        payload: qrData.payload,
        expiresAt: qrData.expirationDate,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro interno do servidor';
    console.error('[create-pix-payment] Erro:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

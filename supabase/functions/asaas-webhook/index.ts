// Supabase Edge Function: asaas-webhook
// ─────────────────────────────────────────────────────────────────────────────
// Espelha o stripe-webhook: só este endpoint, chamado pelo Asaas com o
// pagamento já confirmado, concede Premium/créditos. O client (paywall.tsx)
// nunca libera nada sozinho a partir da resposta da API — só mostra o QR Code
// e espera essa confirmação chegar.
//
// Para publicar:
//   supabase functions deploy asaas-webhook --no-verify-jwt
//   (--no-verify-jwt porque quem chama é o Asaas, não um usuário logado; a
//   segurança vem do token de acesso do webhook verificado abaixo, não de um JWT.)
//
// Configurar no painel do Asaas → Integrações → Webhooks:
//   URL: https://<project-ref>.supabase.co/functions/v1/asaas-webhook
//   Eventos: PAYMENT_CONFIRMED, PAYMENT_RECEIVED
//   Token de acesso: o mesmo valor salvo em ASAAS_WEBHOOK_TOKEN (variável de
//   ambiente desta função) — o Asaas reenvia esse token no header
//   "asaas-access-token" em toda chamada, e é isso que autentica a requisição.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const expectedToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN');
  if (!expectedToken) {
    console.error('[asaas-webhook] ASAAS_WEBHOOK_TOKEN não configurado.');
    return new Response('Server misconfigured', { status: 500 });
  }

  const receivedToken = req.headers.get('asaas-access-token');
  if (receivedToken !== expectedToken) {
    console.warn('[asaas-webhook] Token de acesso inválido.');
    return new Response('Unauthorized', { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const event = body?.event as string | undefined;
  const payment = body?.payment;

  // Só nos interessa confirmação de pagamento Pix; outros eventos (cobrança
  // vencida, estornada, etc.) confirmamos o recebimento sem processar.
  if ((event !== 'PAYMENT_CONFIRMED' && event !== 'PAYMENT_RECEIVED') || !payment) {
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const externalReference = payment.externalReference as string | undefined;
  if (!externalReference || !externalReference.includes(':')) {
    console.warn('[asaas-webhook] Pagamento sem externalReference válido, ignorando.', payment.id);
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const [userId, plan] = externalReference.split(':');
  if (!userId || (plan !== 'topup' && plan !== 'monthly')) {
    console.warn('[asaas-webhook] externalReference com formato inesperado, ignorando.', externalReference);
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    if (plan === 'topup') {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('topup_scans, topup_searches')
        .eq('id', userId)
        .single();

      await adminClient.from('profiles').update({
        topup_scans: (profile?.topup_scans ?? 0) + 2,
        topup_searches: (profile?.topup_searches ?? 0) + 3,
      }).eq('id', userId);

      console.log(`[asaas-webhook] Pacote Avulso (Pix) concedido para userId=${userId}`);
    } else {
      // Cobre tanto o primeiro pagamento quanto cada renovação mensal da
      // assinatura Asaas (billingType PIX, cycle MONTHLY criada em
      // create-pix-payment) — o Asaas gera e confirma uma cobrança nova a
      // cada ciclo, e cada uma dispara este mesmo evento.
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await adminClient.from('profiles').update({
        subscription_plan: 'premium',
        subscription_expires_at: expiresAt.toISOString(),
        ...(payment.subscription ? { asaas_subscription_id: payment.subscription } : {}),
      }).eq('id', userId);

      console.log(`[asaas-webhook] Premium Mensal (Pix) concedido para userId=${userId} até ${expiresAt.toISOString()}`);
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro interno';
    console.error('[asaas-webhook] Erro ao conceder benefício:', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});

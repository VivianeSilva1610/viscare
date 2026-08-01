// Supabase Edge Function: stripe-webhook
// ─────────────────────────────────────────────────────────────────────────────
// Fecha uma falha de segurança real: até esta função existir, o app liberava
// Premium/créditos direto no client (paywall.tsx) só por causa do `?success=true`
// na URL de retorno do Stripe Checkout — sem NENHUMA confirmação de que o
// pagamento realmente aconteceu. Qualquer usuário logado podia digitar
// "viscare.app.br/paywall?success=true&plan=monthly" e ganhar Premium de graça.
//
// Agora é este webhook — chamado pelo Stripe, com assinatura verificada — quem
// concede o benefício. O client (paywall.tsx) só espera e confere o perfil.
//
// Para publicar:
//   supabase functions deploy stripe-webhook --no-verify-jwt
//   (--no-verify-jwt porque quem chama é o Stripe, não um usuário logado;
//   a segurança vem da verificação de assinatura abaixo, não de um JWT.)
//
// Configurar no Dashboard do Stripe → Developers → Webhooks um endpoint
// apontando para esta função, escutando "checkout.session.completed",
// "payment_intent.succeeded" e "invoice.paid" (esse último é o que faz a
// renovação automática da assinatura mensal funcionar sem o cliente refazer
// o pagamento). O "Signing secret" mostrado lá deve bater com o segredo
// STRIPE_WEBHOOK_SECRET já configurado no Supabase.

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!stripeSecretKey || !webhookSecret) {
    console.error('[stripe-webhook] STRIPE_SECRET_KEY ou STRIPE_WEBHOOK_SECRET não configurados.');
    return new Response('Server misconfigured', { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });

  // Precisa do corpo cru (não parseado) para verificar a assinatura.
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    // constructEventAsync (não a versão síncrona) porque o runtime Deno das
    // Edge Functions não tem o módulo crypto do Node que a versão síncrona usa.
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Assinatura inválida';
    console.error('[stripe-webhook] Falha na verificação de assinatura:', msg);
    return new Response(`Webhook signature verification failed: ${msg}`, { status: 400 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    // Renovação automática da assinatura mensal: dispara na primeira cobrança
    // E em cada renovação mensal seguinte, sem o cliente fazer nada. É este
    // evento que faz a cobrança recorrente de verdade funcionar.
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string | null;
      if (!subscriptionId) {
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const userId = subscription.metadata?.userId;
      if (!userId) {
        console.warn('[stripe-webhook] invoice.paid sem userId na subscription, ignorando.', subscriptionId);
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const expiresAt = new Date(subscription.current_period_end * 1000);
      await adminClient.from('profiles').update({
        subscription_plan: 'premium',
        subscription_expires_at: expiresAt.toISOString(),
      }).eq('id', userId);

      console.log(`[stripe-webhook] Assinatura renovada para userId=${userId} até ${expiresAt.toISOString()}`);
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    let metadata: Record<string, string> | null | undefined;
    let sessionForSubscription: Stripe.Checkout.Session | null = null;
    if (event.type === 'checkout.session.completed') {
      sessionForSubscription = event.data.object as Stripe.Checkout.Session;
      metadata = sessionForSubscription.metadata;
    } else if (event.type === 'payment_intent.succeeded') {
      metadata = (event.data.object as Stripe.PaymentIntent).metadata;
    } else {
      // Evento que não nos interessa — confirma recebimento sem processar.
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    const userId = metadata?.userId;
    const plan = metadata?.plan;
    if (!userId || !plan) {
      console.warn('[stripe-webhook] Evento sem userId/plan em metadata, ignorando.', event.type);
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

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

      console.log(`[stripe-webhook] Pacote Avulso concedido para userId=${userId}`);
    } else if (plan === 'monthly') {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await adminClient.from('profiles').update({
        subscription_plan: 'premium',
        subscription_expires_at: expiresAt.toISOString(),
        // Guarda os IDs do Stripe assim que a assinatura é criada, para
        // permitir abrir o Customer Portal (cancelamento self-service) depois.
        ...(sessionForSubscription?.mode === 'subscription' ? {
          stripe_customer_id: sessionForSubscription.customer as string,
          stripe_subscription_id: sessionForSubscription.subscription as string,
        } : {}),
      }).eq('id', userId);

      console.log(`[stripe-webhook] Premium Mensal concedido para userId=${userId} até ${expiresAt.toISOString()}`);
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro interno';
    console.error('[stripe-webhook] Erro ao conceder benefício:', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});

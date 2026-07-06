// Supabase Edge Function: create-payment-intent
// ─────────────────────────────────────────────────────────────────────────────
// Esta função roda NO SERVIDOR (Supabase) e é a única que tem acesso
// à chave secreta do Stripe. O app cliente NUNCA vê esta chave.
//
// Para publicar:
//   supabase functions deploy create-payment-intent --no-verify-jwt
//
// Configurar variável de ambiente no painel Supabase:
//   STRIPE_SECRET_KEY = sk_test_SUA_CHAVE_SECRETA_AQUI
//   (Settings → Edge Functions → Environment variables)

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Preços em centavos por plano e moeda (EUR como referência)
// topup   = €2.99 (avulso: +2 análises +3 explorações)
// monthly = €3.99 (premium mensal: tudo ilimitado)
const PRICES_CENTS: Record<string, Record<string, number>> = {
  topup:   { EUR: 299,  BRL: 1759, USD: 317,  GBP: 263, JPY: 483,  CAD: 440,  AUD: 493,  CHF: 281 },
  monthly: { EUR: 399,  BRL: 2346, USD: 423,  GBP: 351, JPY: 645,  CAD: 587,  AUD: 658,  CHF: 375 },
};

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe não configurado no servidor. Adicione STRIPE_SECRET_KEY nas variáveis de ambiente do Supabase.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });

    const { userId, plan, currency, useCheckout } = await req.json();

    if (!userId || !plan) {
      return new Response(
        JSON.stringify({ error: 'userId e plan são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validCurrency = ['BRL', 'EUR', 'USD', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD'].includes(currency)
      ? currency
      : 'BRL';

    // Preço em centavos para esta moeda
    const planPrices = PRICES_CENTS[plan] ?? PRICES_CENTS.topup;
    const amountCents = planPrices[validCurrency] || planPrices.BRL;

    if (useCheckout) {
      // Cria uma Checkout Session de pagamento único
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: validCurrency.toLowerCase(),
              product_data: {
                name: plan === 'topup'
                  ? 'VisCare — Pacote Avulso (+2 análises +3 explorações)'
                  : 'VisCare Premium Mensal — Tudo ilimitado por 30 dias',
                description: plan === 'topup'
                  ? '+2 análises faciais com IA e +3 explorações de ingredientes/produtos.'
                  : 'Acesso completo e ilimitado a todas as funcionalidades por 30 dias.',
              },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `https://viscare.app.br/paywall?success=true&plan=${plan}`,
        cancel_url: `https://viscare.app.br/paywall?canceled=true`,
        metadata: {
          userId,
          plan,
        },
      });

      return new Response(
        JSON.stringify({ url: session.url }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cria o PaymentIntent no Stripe (para fallback móvel/nativos se necessário)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: validCurrency.toLowerCase(),
      metadata: {
        userId,
        plan,
        app: 'viscare',
      },
      automatic_payment_methods: { enabled: true },
    });

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro interno do servidor';
    console.error('[create-payment-intent] Erro:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

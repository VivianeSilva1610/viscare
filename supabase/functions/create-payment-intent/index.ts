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

// Preços em centavos (BRL) — evita decimais problemáticos
const PRICES_BRL_CENTS: Record<string, Record<string, number>> = {
  monthly: { BRL: 1990, EUR: 340, USD: 360, GBP: 280, JPY: 550 },
  yearly:  { BRL: 14990, EUR: 2560, USD: 2700, GBP: 2100, JPY: 4150 },
};

// Mapas de moeda para Price IDs do Stripe (criar no painel stripe.com após configurar conta)
// dashboard.stripe.com → Products → Add product → Add price
const STRIPE_PRICE_IDS: Record<string, Record<string, string>> = {
  monthly: {
    BRL: 'price_viscare_monthly_brl', // Substituir pelos IDs reais após criar no Stripe
    EUR: 'price_viscare_monthly_eur',
    USD: 'price_viscare_monthly_usd',
    DEFAULT: 'price_viscare_monthly_brl',
  },
  yearly: {
    BRL: 'price_viscare_yearly_brl',
    EUR: 'price_viscare_yearly_eur',
    USD: 'price_viscare_yearly_usd',
    DEFAULT: 'price_viscare_yearly_brl',
  },
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
    const planPrices = PRICES_BRL_CENTS[plan] || PRICES_BRL_CENTS.monthly;
    const amountCents = planPrices[validCurrency] || planPrices.BRL;

    if (useCheckout) {
      // Cria uma Checkout Session de assinatura para redirecionamento web seguro
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: validCurrency.toLowerCase(),
              product_data: {
                name: plan === 'monthly' ? 'VisCare Premium — Mensal' : 'VisCare Premium — Anual',
                description: plan === 'monthly' 
                  ? 'Período gratuito de 7 dias. Depois, será cobrado o valor da assinatura mensal.'
                  : 'Período gratuito de 7 dias. Depois, será cobrado o valor da assinatura anual (37% de desconto).',
              },
              unit_amount: amountCents,
              recurring: {
                interval: plan === 'monthly' ? 'month' : 'year',
              },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        subscription_data: {
          trial_period_days: 7,
          metadata: {
            userId,
            plan,
          },
        },
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

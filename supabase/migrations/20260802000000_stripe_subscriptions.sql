-- IDs do Stripe para permitir assinatura mensal recorrente de verdade e
-- abrir o Customer Portal (cancelamento self-service) a partir do app.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

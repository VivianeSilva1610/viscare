-- IDs do Asaas para permitir cobrança via Pix (avulso e assinatura mensal
-- recorrente) como alternativa ao cartão via Stripe.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT;

-- Inscrições de Web Push (navegador) — necessário porque expo-notifications
-- só cobre push nativo iOS/Android; no site (app.viscare.app.br) usamos a
-- Push API do navegador (Service Worker + VAPID) e guardamos a inscrição
-- aqui pra um cron enviar os lembretes AM/SPF/PM no horário local de cada um.
CREATE TABLE public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    language TEXT NOT NULL DEFAULT 'pt',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own push subscriptions"
  ON public.push_subscriptions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions"
  ON public.push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions"
  ON public.push_subscriptions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

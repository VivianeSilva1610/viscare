-- Consentimento aos Termos de Uso / Política de Privacidade (hoje não existe registro nenhum)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- IA Responsável: qual "motor" gerou o diagnóstico daquele scan
ALTER TABLE public.facial_scans ADD COLUMN IF NOT EXISTS ai_model_version TEXT;

-- Auditoria de ações de privacidade (consentimento, exportação, exclusão)
CREATE TABLE IF NOT EXISTS public.privacy_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- sem FK: precisa sobreviver à exclusão da conta
    event_type TEXT NOT NULL, -- 'terms_accepted' | 'data_export_sent' | 'account_deletion_requested' | 'account_deleted'
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.privacy_audit_log ENABLE ROW LEVEL SECURITY;
-- Usuário pode ver seu próprio histórico de auditoria (transparência); só Edge Functions (service role) inserem.
CREATE POLICY "Users can view their own audit log" ON public.privacy_audit_log FOR SELECT USING (auth.uid() = user_id);

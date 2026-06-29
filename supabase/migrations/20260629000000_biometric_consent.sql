-- Consentimento específico para análise facial por IA (dado biométrico, LGPD Art. 11 / GDPR Art. 9)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS biometric_consent_at TIMESTAMPTZ;

-- Permitir que o usuário apague seu próprio histórico de análises (direito de eliminação, LGPD Art. 18, VI)
CREATE POLICY "Users can delete their own facial scans" ON public.facial_scans FOR DELETE USING (auth.uid() = user_id);

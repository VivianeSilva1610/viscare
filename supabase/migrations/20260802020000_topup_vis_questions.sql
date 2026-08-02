-- Quem compra o Pacote Avulso ganha 3 perguntas pra Vis (assistente de IA),
-- mesmo sem ser Premium. Consumido uma a uma pelo agent-support.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS topup_vis_questions INT NOT NULL DEFAULT 0;

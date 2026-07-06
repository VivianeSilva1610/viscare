-- Novo modelo de monetização: créditos avulso + presente para novos usuários
-- Substitui o limite de 6 scans mensais por um sistema de créditos flexível.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS welcome_scans_used    BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS welcome_searches_used BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS topup_scans           INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS topup_searches        INTEGER     NOT NULL DEFAULT 0;

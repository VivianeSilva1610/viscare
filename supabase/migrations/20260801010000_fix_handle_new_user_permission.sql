-- Corrige um bug crítico: uma migration anterior (secure_handle_new_user)
-- revogou EXECUTE de PUBLIC na função handle_new_user() para travar acesso
-- direto via API, mas nunca concedeu de volta a permissão para o role que o
-- Supabase Auth usa internamente ao inserir um novo usuário
-- (supabase_auth_admin). Sem essa permissão, o trigger on_auth_user_created
-- não consegue rodar — ou seja, TODA conta cadastrada desde então ficou sem
-- linha em public.profiles, silenciosamente mascarado pelo fallback local
-- (MockDatabase) do app cliente.
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

-- Backfill: cria a linha de profiles que faltou para as contas já cadastradas
-- que nunca ganharam uma (não mexe em quem já tem perfil).
INSERT INTO public.profiles (id, email, language, subscription_plan)
SELECT au.id, au.email, COALESCE(au.raw_user_meta_data->>'language', 'pt'), 'free'
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

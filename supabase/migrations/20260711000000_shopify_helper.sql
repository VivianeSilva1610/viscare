-- Função auxiliar: busca o UUID do usuário pelo e-mail (usada pelo webhook do Shopify)
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(user_email TEXT)
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE email = lower(trim(user_email)) LIMIT 1;
$$;

-- Somente funções do servidor podem chamar esta função
REVOKE ALL ON FUNCTION public.get_user_id_by_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO service_role;

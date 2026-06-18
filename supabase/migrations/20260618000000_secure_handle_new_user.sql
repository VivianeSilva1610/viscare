-- Migration to secure the handle_new_user function and address Supabase Security Advisor warnings

-- 1. Pin the search path to prevent search path hijacking (security definer best practice)
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;

-- 2. Revoke execute privileges from PUBLIC to prevent direct execution via the API
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anonymous;

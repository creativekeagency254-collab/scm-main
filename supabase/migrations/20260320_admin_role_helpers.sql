-- Helper functions to manage admin role flags in users.profile_data.
-- Supports role labels like "admin", "admins", "administrator", etc.

CREATE OR REPLACE FUNCTION public.set_user_admin_role(
  p_user_id uuid,
  p_is_admin boolean DEFAULT true,
  p_role text DEFAULT 'admins'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := lower(coalesce(nullif(trim(p_role), ''), 'admins'));
BEGIN
  UPDATE public.users
  SET profile_data = COALESCE(profile_data, '{}'::jsonb) || jsonb_build_object(
    'role', CASE WHEN p_is_admin THEN v_role ELSE 'client' END,
    'category', CASE WHEN p_is_admin THEN 'Admin' ELSE 'Client' END,
    'roles', CASE WHEN p_is_admin THEN jsonb_build_array(v_role) ELSE '[]'::jsonb END,
    'updated_at', now()
  )
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_user_admin_role_by_email(
  p_email text,
  p_is_admin boolean DEFAULT true,
  p_role text DEFAULT 'admins'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT u.user_id
  INTO v_user_id
  FROM public.users u
  WHERE lower(coalesce(u.email, '')) = lower(coalesce(trim(p_email), ''))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'user not found for email %', p_email;
  END IF;

  PERFORM public.set_user_admin_role(v_user_id, p_is_admin, p_role);
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_admin_role(uuid, boolean, text) FROM PUBLIC;
DO $$
BEGIN
  REVOKE ALL ON FUNCTION public.set_user_admin_role(uuid, boolean, text) FROM anon;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
DO $$
BEGIN
  REVOKE ALL ON FUNCTION public.set_user_admin_role(uuid, boolean, text) FROM authenticated;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
GRANT EXECUTE ON FUNCTION public.set_user_admin_role(uuid, boolean, text) TO service_role;

REVOKE ALL ON FUNCTION public.set_user_admin_role_by_email(text, boolean, text) FROM PUBLIC;
DO $$
BEGIN
  REVOKE ALL ON FUNCTION public.set_user_admin_role_by_email(text, boolean, text) FROM anon;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
DO $$
BEGIN
  REVOKE ALL ON FUNCTION public.set_user_admin_role_by_email(text, boolean, text) FROM authenticated;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
GRANT EXECUTE ON FUNCTION public.set_user_admin_role_by_email(text, boolean, text) TO service_role;

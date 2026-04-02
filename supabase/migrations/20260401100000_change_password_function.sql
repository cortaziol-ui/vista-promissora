-- Function to allow admin to change a user's password
-- Uses Supabase's internal auth schema
CREATE OR REPLACE FUNCTION public.change_user_password(target_user_id uuid, new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public, auth
AS $$
BEGIN
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;
END;
$$;

-- Only allow authenticated users to call this (admin check done in app)
REVOKE ALL ON FUNCTION public.change_user_password FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.change_user_password TO authenticated;

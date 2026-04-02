-- Function to create a new auth user and assign a role
CREATE OR REPLACE FUNCTION public.create_app_user(
  user_email text,
  user_password text,
  user_role text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public, auth
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO new_user_id FROM auth.users WHERE email = user_email;

  IF new_user_id IS NOT NULL THEN
    -- User exists, just ensure role is set
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, user_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN new_user_id;
  END IF;

  -- Create the user
  new_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    aud, role
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    user_email,
    crypt(user_password, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    'authenticated',
    'authenticated'
  );

  -- Create identity
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    created_at, updated_at, last_sign_in_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', user_email),
    'email',
    new_user_id::text,
    now(), now(), now()
  );

  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, user_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN new_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_app_user FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_app_user TO authenticated;

-- Create the two new accounts
SELECT public.create_app_user('adm@outcom.com', 'Adm2026!', 'administrativo');
SELECT public.create_app_user('financeiro@outcom.com', 'Fin2026!', 'financeiro');

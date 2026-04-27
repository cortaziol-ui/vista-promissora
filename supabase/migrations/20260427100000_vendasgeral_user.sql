-- ============================================================
-- Cria o user vendasgeral@outcom.com com modo consolidado
-- (vê dados das duas outcoms juntas, mesmo nível de acesso do
-- vendas@outcom.com — apenas /vendas e /roleta)
-- ============================================================

-- 1. Cria o user no auth.users (se não existir)
-- Senha inicial: outcom2026 (Caio pode trocar depois em Configurações)
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Verifica se o user já existe
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'vendasgeral@outcom.com';

  IF v_user_id IS NULL THEN
    -- Insere novo user com senha 'outcom2026'
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'vendasgeral@outcom.com',
      crypt('outcom2026', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO v_user_id;

    -- Cria identity correspondente
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'vendasgeral@outcom.com', 'email_verified', true),
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    );
  END IF;

  -- 2. Atribui role 'seller' (idempotente)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'seller')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 3. Vincula às 2 contas Outcom como seller
  INSERT INTO public.user_accounts (user_id, account_id, role, is_default)
  VALUES
    (v_user_id, 'a0000000-0000-0000-0000-000000000001'::uuid, 'seller', true),
    (v_user_id, 'a0000000-0000-0000-0000-000000000002'::uuid, 'seller', false)
  ON CONFLICT (user_id, account_id) DO NOTHING;
END $$;

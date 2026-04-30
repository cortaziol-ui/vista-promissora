-- ============================================================
-- Vincula explicitamente gerente@outcom.com à Outcom 2
-- ============================================================
-- Contexto: a migration 20260430000000 vinculou todos os users com
-- role 'manager' (em user_roles) à Outcom 2. Mas o usuário
-- gerente@outcom.com não foi pego — provavelmente porque não tem
-- entrada em user_roles com role='manager' (ou foi criado com role
-- diferente).
--
-- Esta migration é direcionada: localiza o user pelo email e
-- adiciona a linha em user_accounts pra Outcom 2 com role manager.
-- ============================================================

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'gerente@outcom.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Usuário gerente@outcom.com não encontrado em auth.users';
    RETURN;
  END IF;

  -- Garante role 'manager' em user_roles (idempotente)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'manager'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Garante vínculo com Outcom 1 (caso ainda não exista) como default
  INSERT INTO public.user_accounts (user_id, account_id, role, is_default)
  VALUES (v_user_id, 'a0000000-0000-0000-0000-000000000001'::uuid, 'manager'::app_role, true)
  ON CONFLICT (user_id, account_id) DO NOTHING;

  -- Vincula à Outcom 2 (objetivo principal desta migration)
  INSERT INTO public.user_accounts (user_id, account_id, role, is_default)
  VALUES (v_user_id, 'a0000000-0000-0000-0000-000000000002'::uuid, 'manager'::app_role, false)
  ON CONFLICT (user_id, account_id) DO NOTHING;

  RAISE NOTICE 'gerente@outcom.com vinculado à Outcom 1 e Outcom 2';
END $$;

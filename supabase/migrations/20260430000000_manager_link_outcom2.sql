-- ============================================================
-- Vincula users com role 'manager' à Outcom 2
-- ============================================================
-- Contexto: a migration 20260416 (multi-tenancy) só vinculou users
-- com role 'admin' à conta Outcom 2 (linha 69: WHERE ur.role = 'admin').
-- Resultado: gerentes (role manager) só conseguem ver Outcom 1 e o
-- account switcher da sidebar nem aparece (isMultiTenant fica false
-- porque accounts.length === 1).
--
-- Esta migration estende o vínculo a managers para que possam
-- alternar entre Outcom 1 e Outcom 2 igual aos admins.
-- ============================================================

INSERT INTO public.user_accounts (user_id, account_id, role, is_default)
SELECT
  ur.user_id,
  'a0000000-0000-0000-0000-000000000002'::uuid,
  ur.role,
  false
FROM public.user_roles ur
WHERE ur.role = 'manager'
ON CONFLICT (user_id, account_id) DO NOTHING;

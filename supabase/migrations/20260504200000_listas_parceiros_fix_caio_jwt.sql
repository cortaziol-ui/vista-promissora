-- ============================================================
-- Fix: usar auth.jwt() ->> 'email' em vez de SELECT em auth.users
-- ============================================================
-- A migration anterior (20260504100000) tentava ler `auth.users.email`
-- dentro da policy, mas usuários `authenticated` não têm acesso direto
-- a `auth.users` — o resultado era NULL, então NINGUÉM conseguia editar
-- (nem o próprio Caio).
--
-- A forma idiomática de checar email do user logado em RLS é via JWT:
--   auth.jwt() ->> 'email'
-- O JWT já contém o email no claim padrão do GoTrue.

-- ===== listas_parceiros =====
DROP POLICY IF EXISTS "caio_only_manage_listas_parceiros" ON public.listas_parceiros;

CREATE POLICY "caio_only_manage_listas_parceiros"
  ON public.listas_parceiros FOR ALL TO authenticated
  USING (
    account_id IN (SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid())
    AND lower(auth.jwt() ->> 'email') = 'caio@outcom.com'
  )
  WITH CHECK (
    account_id IN (SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid())
    AND lower(auth.jwt() ->> 'email') = 'caio@outcom.com'
  );

-- ===== listas_parceiros_orgaos =====
DROP POLICY IF EXISTS "caio_only_manage_listas_orgaos" ON public.listas_parceiros_orgaos;

CREATE POLICY "caio_only_manage_listas_orgaos"
  ON public.listas_parceiros_orgaos FOR ALL TO authenticated
  USING (
    lista_id IN (
      SELECT id FROM public.listas_parceiros
      WHERE account_id IN (SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid())
    )
    AND lower(auth.jwt() ->> 'email') = 'caio@outcom.com'
  )
  WITH CHECK (
    lista_id IN (
      SELECT id FROM public.listas_parceiros
      WHERE account_id IN (SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid())
    )
    AND lower(auth.jwt() ->> 'email') = 'caio@outcom.com'
  );

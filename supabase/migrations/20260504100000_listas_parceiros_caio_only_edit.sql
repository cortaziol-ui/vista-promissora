-- ============================================================
-- Restringe edição das listas de parceiros apenas ao Caio (dono da Outcom)
-- ============================================================
-- Antes: admin/manager da account podiam editar.
-- Agora: somente o user com email = 'caio@outcom.com' pode INSERT/UPDATE/DELETE.
-- Leitura continua liberada pra todos os usuários autenticados da account
-- (admin, manager, seller, administrativo, financeiro) e via slug público (anon).

-- ===== listas_parceiros =====
DROP POLICY IF EXISTS "admin_manager_manage_listas_parceiros" ON public.listas_parceiros;

CREATE POLICY "caio_only_manage_listas_parceiros"
  ON public.listas_parceiros FOR ALL TO authenticated
  USING (
    account_id IN (SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid())
    AND (SELECT email FROM auth.users WHERE id = auth.uid()) = 'caio@outcom.com'
  )
  WITH CHECK (
    account_id IN (SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid())
    AND (SELECT email FROM auth.users WHERE id = auth.uid()) = 'caio@outcom.com'
  );

-- ===== listas_parceiros_orgaos =====
DROP POLICY IF EXISTS "admin_manager_manage_listas_orgaos" ON public.listas_parceiros_orgaos;

CREATE POLICY "caio_only_manage_listas_orgaos"
  ON public.listas_parceiros_orgaos FOR ALL TO authenticated
  USING (
    lista_id IN (
      SELECT id FROM public.listas_parceiros
      WHERE account_id IN (SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid())
    )
    AND (SELECT email FROM auth.users WHERE id = auth.uid()) = 'caio@outcom.com'
  )
  WITH CHECK (
    lista_id IN (
      SELECT id FROM public.listas_parceiros
      WHERE account_id IN (SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid())
    )
    AND (SELECT email FROM auth.users WHERE id = auth.uid()) = 'caio@outcom.com'
  );

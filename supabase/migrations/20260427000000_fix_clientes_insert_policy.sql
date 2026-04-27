-- ============================================================
-- Fix: permitir admin/manager/administrativo/financeiro inserir clientes
-- ============================================================
-- A policy original `account_insert_clientes` exigia role='seller', então
-- admins (Caio) não conseguiam cadastrar cliente novo na planilha.
-- Aqui a gente substitui a policy permitindo todos os roles que já estão
-- na policy `account_manage_clientes` (ALL) — admin, manager, administrativo,
-- financeiro — mais o seller.

DROP POLICY IF EXISTS "account_insert_clientes" ON public.clientes;

CREATE POLICY "account_insert_clientes"
  ON public.clientes FOR INSERT TO authenticated
  WITH CHECK (
    account_id IN (
      SELECT ua.account_id FROM public.user_accounts ua
      WHERE ua.user_id = auth.uid()
    )
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'manager'::app_role)
      OR public.has_role(auth.uid(), 'seller'::app_role)
      OR public.has_role(auth.uid(), 'administrativo'::app_role)
      OR public.has_role(auth.uid(), 'financeiro'::app_role)
    )
  );

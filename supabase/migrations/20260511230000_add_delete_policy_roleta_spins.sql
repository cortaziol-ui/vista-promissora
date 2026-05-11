-- Permite que admin e manager apaguem giradas da roleta, restrito a contas
-- as quais o usuario pertence. Espelha a policy de UPDATE ja existente.

CREATE POLICY account_delete_roleta_spins
ON public.roleta_spins
FOR DELETE
TO authenticated
USING (
  account_id IN (
    SELECT ua.account_id
    FROM user_accounts ua
    WHERE ua.user_id = auth.uid()
  )
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  )
);

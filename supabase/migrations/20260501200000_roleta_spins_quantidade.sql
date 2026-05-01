-- Adiciona controle de quantidade entregue em prêmios da roleta.
-- Pacotes (ex.: "Pack 6 Monster", "2 Marmitas") são entregues em parcelas;
-- quando quantidade_entregue atinge quantidade_total, status vai automaticamente para 'pago'.

ALTER TABLE public.roleta_spins
  ADD COLUMN IF NOT EXISTS quantidade_total INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS quantidade_entregue INT NOT NULL DEFAULT 0;

ALTER TABLE public.roleta_spins
  DROP CONSTRAINT IF EXISTS roleta_spins_quantidade_check;

ALTER TABLE public.roleta_spins
  ADD CONSTRAINT roleta_spins_quantidade_check
  CHECK (quantidade_total >= 1 AND quantidade_entregue >= 0 AND quantidade_entregue <= quantidade_total);

-- Permite que manager (gerente) também atualize, além do admin (Caio dono).
DROP POLICY IF EXISTS "account_update_roleta_spins" ON public.roleta_spins;

CREATE POLICY "account_update_roleta_spins"
  ON public.roleta_spins FOR UPDATE TO authenticated
  USING (
    account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

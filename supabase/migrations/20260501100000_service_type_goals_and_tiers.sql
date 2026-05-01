-- Migration: Metas e tiers de comissao separados por tipo de servico
-- Date: 2026-05-01
-- Adiciona suporte para meta separada de Limpa Nome, Rating e Geral.

-- 1. vendor_monthly_goals: nova coluna service_type + constraint composta
ALTER TABLE public.vendor_monthly_goals
  ADD COLUMN IF NOT EXISTS service_type TEXT NOT NULL DEFAULT 'GERAL';

ALTER TABLE public.vendor_monthly_goals
  DROP CONSTRAINT IF EXISTS vendor_monthly_goals_account_month_vendedor;

ALTER TABLE public.vendor_monthly_goals
  ADD CONSTRAINT vendor_monthly_goals_account_month_vendedor_service
  UNIQUE (account_id, month, vendedor_id, service_type);

-- 2. commission_tiers: nova coluna service_type
ALTER TABLE public.commission_tiers
  ADD COLUMN IF NOT EXISTS service_type TEXT NOT NULL DEFAULT 'GERAL';

-- 3. Seed: para cada (account_id, month) que tem tiers em GERAL,
--    duplicar como LIMPA_NOME e RATING (mesmos valores como ponto de partida).
INSERT INTO public.commission_tiers
  (month, vendedor_id, faixa_nome, pct_meta, premiacao, sort_order, account_id, service_type)
SELECT month, vendedor_id, faixa_nome, pct_meta, premiacao, sort_order, account_id, 'LIMPA_NOME'
FROM public.commission_tiers
WHERE service_type = 'GERAL'
  AND NOT EXISTS (
    SELECT 1 FROM public.commission_tiers ct2
    WHERE ct2.account_id = public.commission_tiers.account_id
      AND ct2.month = public.commission_tiers.month
      AND ct2.service_type = 'LIMPA_NOME'
      AND ct2.sort_order = public.commission_tiers.sort_order
      AND COALESCE(ct2.vendedor_id, -1) = COALESCE(public.commission_tiers.vendedor_id, -1)
  );

INSERT INTO public.commission_tiers
  (month, vendedor_id, faixa_nome, pct_meta, premiacao, sort_order, account_id, service_type)
SELECT month, vendedor_id, faixa_nome, pct_meta, premiacao, sort_order, account_id, 'RATING'
FROM public.commission_tiers
WHERE service_type = 'GERAL'
  AND NOT EXISTS (
    SELECT 1 FROM public.commission_tiers ct2
    WHERE ct2.account_id = public.commission_tiers.account_id
      AND ct2.month = public.commission_tiers.month
      AND ct2.service_type = 'RATING'
      AND ct2.sort_order = public.commission_tiers.sort_order
      AND COALESCE(ct2.vendedor_id, -1) = COALESCE(public.commission_tiers.vendedor_id, -1)
  );

-- 4. Indices para performance das queries filtradas por service_type
CREATE INDEX IF NOT EXISTS idx_commission_tiers_service ON public.commission_tiers(account_id, month, service_type);
CREATE INDEX IF NOT EXISTS idx_vendor_monthly_goals_service ON public.vendor_monthly_goals(account_id, month, service_type);

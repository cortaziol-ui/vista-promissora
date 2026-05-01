-- ============================================
-- vendedores.inactive_from
-- ============================================
-- Permite "desativar" vendedor a partir de uma data preservando o histórico.
-- Vendas/comissões/spins anteriores continuam intactos.
-- Lógica de uso no front:
--   - Dropdowns de seleção (lançar venda, filtros, roleta): ocultar vendedores
--     onde inactive_from IS NOT NULL AND inactive_from <= today.
--   - Rankings/splits por mês: ocultar vendedores onde
--     inactive_from <= primeiro_dia_do_mes_consultado.

ALTER TABLE public.vendedores
  ADD COLUMN IF NOT EXISTS inactive_from DATE;

COMMENT ON COLUMN public.vendedores.inactive_from IS
  'Data a partir da qual o vendedor sai dos rankings/dropdowns. NULL = ativo. Histórico anterior é preservado.';

-- Inativa Lucas (Cunha) a partir de 2026-05-01 nas duas accounts (se existir nas duas).
-- Match por nome (case-insensitive, whitespace-tolerant). Cobre 'Lucas', 'Lucas Cunha'
-- e variações. Pega tanto o seed antigo legado quanto o registro atual da Outcom.
UPDATE public.vendedores
SET inactive_from = DATE '2026-05-01'
WHERE TRIM(LOWER(nome)) = 'lucas'
   OR TRIM(LOWER(nome)) LIKE 'lucas cunha%'
   OR TRIM(LOWER(nome)) LIKE 'lucas %cunha%';

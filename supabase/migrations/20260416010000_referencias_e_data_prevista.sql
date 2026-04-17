-- ============================================================
-- Adiciona: 2 referências pessoais + datas previstas de pagamento
-- ============================================================

-- Referências pessoais (Nome, Telefone, Grau de Parentesco)
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS referencia1_nome TEXT,
  ADD COLUMN IF NOT EXISTS referencia1_telefone TEXT,
  ADD COLUMN IF NOT EXISTS referencia1_grau TEXT,
  ADD COLUMN IF NOT EXISTS referencia2_nome TEXT,
  ADD COLUMN IF NOT EXISTS referencia2_telefone TEXT,
  ADD COLUMN IF NOT EXISTS referencia2_grau TEXT;

-- Datas previstas de pagamento
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS parcela1_data_prevista TEXT,
  ADD COLUMN IF NOT EXISTS parcela2_data_prevista TEXT,
  ADD COLUMN IF NOT EXISTS parcela3_data_prevista TEXT;

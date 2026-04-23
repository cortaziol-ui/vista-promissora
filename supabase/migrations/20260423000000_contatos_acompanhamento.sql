-- ============================================================
-- Contatos de acompanhamento por cliente (jornada pós-venda)
-- ============================================================
-- Formato: JSONB array com 6 objetos { n, titulo, data, status, obs }
-- status: 'pendente' | 'feito' | 'cancelado'
-- data: DD/MM/YYYY ou ''

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS contatos JSONB;

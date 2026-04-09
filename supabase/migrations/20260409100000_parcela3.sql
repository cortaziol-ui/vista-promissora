-- Add parcela3 columns for double sales (LIMPA NOME + RATING)
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS parcela3_valor NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parcela3_status TEXT NOT NULL DEFAULT 'AGUARDANDO',
  ADD COLUMN IF NOT EXISTS parcela3_data_pagamento TEXT;

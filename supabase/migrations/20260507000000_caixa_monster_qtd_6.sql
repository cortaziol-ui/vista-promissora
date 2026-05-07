-- "Caixa de Monster" (prêmio da Meta Semanal) é um pack de 6 latas, mas os
-- spins antigos foram salvos com quantidade_total = 1 porque o label não tinha
-- número explícito. Renomeia pra "Pack 6 Monster" e ajusta o pack pra 6 unidades
-- pra habilitar o contador +/- na UI.

-- 1. Spins históricos: renomeia label e infla pack pra 6.
--    - 'pendente' com quantidade_entregue = 0 vira 6/0.
--    - 'pago' (quantidade_entregue = 1) vira 6/6 (entrega completa preservada).
--    - parciais (improvável, dado que o pack era 1) viram 6/quantidade_entregue.
UPDATE public.roleta_spins
SET
  premio = 'Pack 6 Monster',
  quantidade_total = 6,
  quantidade_entregue = CASE
    WHEN status = 'pago' THEN 6
    ELSE quantidade_entregue
  END
WHERE premio ILIKE '%caixa%monster%';

-- 2. Renomeia o label na config de prêmios customizados (company_settings) de
--    cada conta que tenha sobrescrito a roleta. JSONB rewrite via jsonb_set
--    aplicado a cada array de prêmios que contenha o item antigo.
UPDATE public.company_settings
SET value = (
  SELECT jsonb_object_agg(
    motivo_key,
    (
      SELECT jsonb_agg(
        CASE
          WHEN prize->>'label' = 'Caixa de Monster' THEN jsonb_set(prize, '{label}', '"Pack 6 Monster"')
          ELSE prize
        END
      )
      FROM jsonb_array_elements(motivo_value) AS prize
    )
  )
  FROM jsonb_each(value) AS t(motivo_key, motivo_value)
)
WHERE key = 'roleta_prizes'
  AND value::text ILIKE '%Caixa de Monster%';

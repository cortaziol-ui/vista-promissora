-- Migration: limita tiers de comissao a 200% (remove Lenda, Lenda+, Maximo, Absoluto)
-- Date: 2026-05-01
-- Pedido do Caio: tier de performance por vendedor agora vai so ate 200% em vez de 300%.

DELETE FROM public.commission_tiers
WHERE pct_meta > 200;

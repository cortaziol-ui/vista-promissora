-- Migration: Commission Tiers System
-- Date: 2026-03-30

-- 1. Create commission_tiers table
CREATE TABLE public.commission_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL,
  vendedor_id INTEGER REFERENCES public.vendedores(id) ON DELETE CASCADE,
  faixa_nome TEXT NOT NULL,
  pct_meta NUMERIC NOT NULL,
  premiacao NUMERIC NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.commission_tiers ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Authenticated users can read commission_tiers"
  ON public.commission_tiers FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage commission_tiers"
  ON public.commission_tiers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Company settings: meta keys
INSERT INTO public.company_settings (key, value)
VALUES ('meta_empresa_vendas', '78'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.company_settings (key, value)
VALUES ('meta_comercial_vendas', '90'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 5. Seed default commission tiers for March 2026 (global, vendedor_id=NULL)
INSERT INTO public.commission_tiers (month, vendedor_id, faixa_nome, pct_meta, premiacao, sort_order) VALUES
  ('2026-03', NULL, 'Mínima',   70,  100, 1),
  ('2026-03', NULL, 'Meta',     100, 200, 2),
  ('2026-03', NULL, 'Super',    130, 100, 3),
  ('2026-03', NULL, 'Super+',   150, 150, 4),
  ('2026-03', NULL, 'Elite',    170, 100, 5),
  ('2026-03', NULL, 'Elite+',   200, 150, 6),
  ('2026-03', NULL, 'Lenda',    230, 100, 7),
  ('2026-03', NULL, 'Lenda+',   250, 150, 8),
  ('2026-03', NULL, 'Máximo',   270, 100, 9),
  ('2026-03', NULL, 'Absoluto', 300, 150, 10);

-- 6. Update vendedores metas to sales count numbers
UPDATE public.vendedores SET meta = 20 WHERE nome = 'Bianca';
UPDATE public.vendedores SET meta = 20 WHERE nome = 'Nayra';
UPDATE public.vendedores SET meta = 10 WHERE nome = 'Lucas';
UPDATE public.vendedores SET meta = 10 WHERE nome = 'Gustavo';
UPDATE public.vendedores SET meta = 10 WHERE nome = 'Cunha';
UPDATE public.vendedores SET meta = 10 WHERE nome = 'Leandro teste';

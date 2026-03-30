-- Migration: Custos Mensais (Fixed & Variable Costs)
-- Date: 2026-03-30

CREATE TABLE public.custos_mensais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('fixo', 'variavel')),
  valor NUMERIC NOT NULL DEFAULT 0,
  mes_referencia TEXT NOT NULL,
  categoria TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.custos_mensais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read custos_mensais"
  ON public.custos_mensais FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage custos_mensais"
  ON public.custos_mensais FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

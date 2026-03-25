
-- ============================================
-- 1. Role enum + user_roles table (security)
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'seller');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admins can see all roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can see their own role
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- 2. Vendedores table
-- ============================================
CREATE TABLE public.vendedores (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  cargo TEXT NOT NULL DEFAULT 'Vendedor',
  meta NUMERIC NOT NULL DEFAULT 0,
  avatar TEXT NOT NULL DEFAULT '👤',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vendedores ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read vendedores
CREATE POLICY "Authenticated users can read vendedores"
  ON public.vendedores FOR SELECT TO authenticated
  USING (true);

-- Admins and managers can update vendedores
CREATE POLICY "Admins can manage vendedores"
  ON public.vendedores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- ============================================
-- 3. Clientes table
-- ============================================
CREATE TABLE public.clientes (
  id SERIAL PRIMARY KEY,
  data TEXT NOT NULL,
  nome TEXT NOT NULL,
  cpf TEXT,
  nascimento TEXT,
  email TEXT,
  telefone TEXT,
  servico TEXT NOT NULL DEFAULT 'LIMPA NOME',
  vendedor TEXT NOT NULL,
  entrada NUMERIC NOT NULL DEFAULT 0,
  parcela1_valor NUMERIC NOT NULL DEFAULT 0,
  parcela1_status TEXT NOT NULL DEFAULT 'AGUARDANDO',
  parcela1_data_pagamento TEXT,
  parcela2_valor NUMERIC NOT NULL DEFAULT 0,
  parcela2_status TEXT NOT NULL DEFAULT 'AGUARDANDO',
  parcela2_data_pagamento TEXT,
  situacao TEXT NOT NULL DEFAULT '',
  valor_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read clientes
CREATE POLICY "Authenticated users can read clientes"
  ON public.clientes FOR SELECT TO authenticated
  USING (true);

-- Admins and managers can do everything with clientes
CREATE POLICY "Admins and managers can manage clientes"
  ON public.clientes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Sellers can insert clientes
CREATE POLICY "Sellers can insert clientes"
  ON public.clientes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'seller'));

-- ============================================
-- 4. Company settings table
-- ============================================
CREATE TABLE public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated can read settings
CREATE POLICY "Authenticated users can read settings"
  ON public.company_settings FOR SELECT TO authenticated
  USING (true);

-- Admins can manage settings
CREATE POLICY "Admins can manage settings"
  ON public.company_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 5. NPS entries table
-- ============================================
CREATE TABLE public.nps_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 10),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nps_entries ENABLE ROW LEVEL SECURITY;

-- All authenticated can read NPS
CREATE POLICY "Authenticated users can read NPS"
  ON public.nps_entries FOR SELECT TO authenticated
  USING (true);

-- Admins and managers can manage NPS
CREATE POLICY "Admins and managers can manage NPS"
  ON public.nps_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- ============================================
-- 6. Updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 7. Seed initial data
-- ============================================

-- Meta mensal global
INSERT INTO public.company_settings (key, value) VALUES ('meta_mensal', '450000'::jsonb);

-- Vendedores (sem user_id por enquanto - será vinculado após criar users via auth)
INSERT INTO public.vendedores (id, nome, cargo, meta, avatar) VALUES
  (1, 'Bianca', 'Vendedora', 150000, '👩'),
  (2, 'Nayra', 'Vendedora', 120000, '👩'),
  (3, 'Lucas', 'Vendedor', 100000, '👨'),
  (4, 'Gustavo', 'Vendedor', 80000, '👨'),
  (5, 'Cunha', 'Vendedor Sênior', 100000, '👨');

-- Reset the sequence
SELECT setval('vendedores_id_seq', 5);

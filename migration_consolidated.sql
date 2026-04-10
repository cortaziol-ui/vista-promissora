-- ============================================
-- MIGRATION 1: Core tables + seed data
-- ============================================

-- 1. Role enum + user_roles table (security)
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

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 2. Vendedores table
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

CREATE POLICY "Authenticated users can read vendedores"
  ON public.vendedores FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage vendedores"
  ON public.vendedores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- 3. Clientes table
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

CREATE POLICY "Authenticated users can read clientes"
  ON public.clientes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage clientes"
  ON public.clientes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Sellers can insert clientes"
  ON public.clientes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'seller'));

-- 4. Company settings table
CREATE TABLE public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read settings"
  ON public.company_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage settings"
  ON public.company_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. NPS entries table
CREATE TABLE public.nps_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 10),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nps_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read NPS"
  ON public.nps_entries FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage NPS"
  ON public.nps_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- 6. Updated_at trigger function
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

-- 7. Seed initial data
INSERT INTO public.company_settings (key, value) VALUES ('meta_mensal', '450000'::jsonb);

-- Vendedores COM user_id vinculado
INSERT INTO public.vendedores (id, user_id, nome, cargo, meta, avatar) VALUES
  (1, '07eef905-3c95-46f5-b362-b311957effbb', 'Bianca', 'Vendedora', 150000, '👩'),
  (2, '06a9bca7-71e7-4bad-9646-66d59e3b0be6', 'Nayra', 'Vendedora', 120000, '👩'),
  (3, '0b6612f6-aa11-4f23-ba3c-1ff401718d4e', 'Lucas', 'Vendedor', 100000, '👨'),
  (4, '322f6d9c-2916-4806-9372-5de6e3157fd9', 'Gustavo', 'Vendedor', 80000, '👨'),
  (5, '8af9fda1-908f-4a2a-b789-0b7e9f814d62', 'Cunha', 'Vendedor Sênior', 100000, '👨');

SELECT setval('vendedores_id_seq', 5);

-- User roles
INSERT INTO public.user_roles (user_id, role) VALUES
  ('2544344a-dfe0-4df4-bf0e-f8324d2a046b', 'admin'),
  ('8af9fda1-908f-4a2a-b789-0b7e9f814d62', 'manager'),
  ('07eef905-3c95-46f5-b362-b311957effbb', 'seller'),
  ('06a9bca7-71e7-4bad-9646-66d59e3b0be6', 'seller'),
  ('0b6612f6-aa11-4f23-ba3c-1ff401718d4e', 'seller'),
  ('322f6d9c-2916-4806-9372-5de6e3157fd9', 'seller');

-- ============================================
-- MIGRATION 2: app_settings + meta_accounts
-- ============================================

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read app_settings"
  ON public.app_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage app_settings"
  ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.meta_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  access_token TEXT NOT NULL DEFAULT '',
  ad_account_id TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read meta_accounts"
  ON public.meta_accounts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage meta_accounts"
  ON public.meta_accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- MIGRATION 3: Update app_settings policies
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can read app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can manage app_settings" ON public.app_settings;

CREATE POLICY "read_app_settings"
  ON public.app_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "write_app_settings"
  ON public.app_settings FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- MIGRATION: Add administrativo/financeiro roles
-- ============================================

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'administrativo';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'financeiro';

SELECT public.create_app_user('adm@outcom.com', 'Adm2026!', 'administrativo');
SELECT public.create_app_user('financeiro@outcom.com', 'Fin2026!', 'financeiro');

CREATE POLICY "Administrativo and Financeiro can manage clientes"
  ON public.clientes FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrativo')
    OR public.has_role(auth.uid(), 'financeiro')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'administrativo')
    OR public.has_role(auth.uid(), 'financeiro')
  );

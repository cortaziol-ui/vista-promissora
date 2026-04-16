-- ============================================================
-- MULTI-TENANCY: accounts + user_accounts + account_id columns
-- ============================================================

-- 1. Create accounts table
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read accounts"
  ON public.accounts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage accounts"
  ON public.accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Create user_accounts junction table
CREATE TABLE public.user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'seller',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, account_id)
);

ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own account mappings"
  ON public.user_accounts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage user_accounts"
  ON public.user_accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Seed two accounts
INSERT INTO public.accounts (id, name, slug) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Outcom Principal', 'outcom1'),
  ('a0000000-0000-0000-0000-000000000002', 'Outcom 2', 'outcom2');

-- 4. Map ALL existing users to account 1 (outcom1)
-- Admin users get admin role, others keep their current role
INSERT INTO public.user_accounts (user_id, account_id, role, is_default)
SELECT
  ur.user_id,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  ur.role,
  true
FROM public.user_roles ur
ON CONFLICT (user_id, account_id) DO NOTHING;

-- Also map admin users to account 2 (outcom2)
INSERT INTO public.user_accounts (user_id, account_id, role, is_default)
SELECT
  ur.user_id,
  'a0000000-0000-0000-0000-000000000002'::uuid,
  ur.role,
  false
FROM public.user_roles ur
WHERE ur.role = 'admin'
ON CONFLICT (user_id, account_id) DO NOTHING;

-- ============================================================
-- 5. Add account_id to ALL data tables + backfill + NOT NULL
-- ============================================================

-- Helper: default account UUID for backfill
-- All existing data belongs to Outcom Principal

-- 5a. vendedores
ALTER TABLE public.vendedores ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;
UPDATE public.vendedores SET account_id = 'a0000000-0000-0000-0000-000000000001';
ALTER TABLE public.vendedores ALTER COLUMN account_id SET NOT NULL;
CREATE INDEX idx_vendedores_account_id ON public.vendedores(account_id);

-- 5b. clientes
ALTER TABLE public.clientes ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;
UPDATE public.clientes SET account_id = 'a0000000-0000-0000-0000-000000000001';
ALTER TABLE public.clientes ALTER COLUMN account_id SET NOT NULL;
CREATE INDEX idx_clientes_account_id ON public.clientes(account_id);

-- 5c. company_settings
ALTER TABLE public.company_settings ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;
UPDATE public.company_settings SET account_id = 'a0000000-0000-0000-0000-000000000001';
ALTER TABLE public.company_settings ALTER COLUMN account_id SET NOT NULL;
-- Drop old unique and create new composite unique
ALTER TABLE public.company_settings DROP CONSTRAINT IF EXISTS company_settings_key_key;
ALTER TABLE public.company_settings ADD CONSTRAINT company_settings_account_key UNIQUE(account_id, key);

-- 5d. app_settings
ALTER TABLE public.app_settings ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;
UPDATE public.app_settings SET account_id = 'a0000000-0000-0000-0000-000000000001';
ALTER TABLE public.app_settings ALTER COLUMN account_id SET NOT NULL;
-- Drop old PK (key only) and create composite
ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_pkey;
ALTER TABLE public.app_settings ADD PRIMARY KEY (account_id, key);

-- 5e. meta_accounts
ALTER TABLE public.meta_accounts ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;
UPDATE public.meta_accounts SET account_id = 'a0000000-0000-0000-0000-000000000001';
ALTER TABLE public.meta_accounts ALTER COLUMN account_id SET NOT NULL;
CREATE INDEX idx_meta_accounts_account_id ON public.meta_accounts(account_id);

-- 5f. nps_entries
ALTER TABLE public.nps_entries ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;
UPDATE public.nps_entries SET account_id = 'a0000000-0000-0000-0000-000000000001';
ALTER TABLE public.nps_entries ALTER COLUMN account_id SET NOT NULL;
CREATE INDEX idx_nps_entries_account_id ON public.nps_entries(account_id);

-- 5g. commission_tiers
ALTER TABLE public.commission_tiers ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;
UPDATE public.commission_tiers SET account_id = 'a0000000-0000-0000-0000-000000000001';
ALTER TABLE public.commission_tiers ALTER COLUMN account_id SET NOT NULL;
CREATE INDEX idx_commission_tiers_account_id ON public.commission_tiers(account_id);

-- 5h. custos_mensais
ALTER TABLE public.custos_mensais ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;
UPDATE public.custos_mensais SET account_id = 'a0000000-0000-0000-0000-000000000001';
ALTER TABLE public.custos_mensais ALTER COLUMN account_id SET NOT NULL;
CREATE INDEX idx_custos_mensais_account_id ON public.custos_mensais(account_id);

-- 5i. monthly_goals
ALTER TABLE public.monthly_goals ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;
UPDATE public.monthly_goals SET account_id = 'a0000000-0000-0000-0000-000000000001';
ALTER TABLE public.monthly_goals ALTER COLUMN account_id SET NOT NULL;
-- Update unique constraint
ALTER TABLE public.monthly_goals DROP CONSTRAINT IF EXISTS monthly_goals_month_key_key;
ALTER TABLE public.monthly_goals ADD CONSTRAINT monthly_goals_account_month_key UNIQUE(account_id, month, key);

-- 5j. vendor_monthly_goals
ALTER TABLE public.vendor_monthly_goals ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;
UPDATE public.vendor_monthly_goals SET account_id = 'a0000000-0000-0000-0000-000000000001';
ALTER TABLE public.vendor_monthly_goals ALTER COLUMN account_id SET NOT NULL;
-- Update unique constraint
ALTER TABLE public.vendor_monthly_goals DROP CONSTRAINT IF EXISTS vendor_monthly_goals_month_vendedor_id_key;
ALTER TABLE public.vendor_monthly_goals ADD CONSTRAINT vendor_monthly_goals_account_month_vendedor UNIQUE(account_id, month, vendedor_id);

-- 5k. campaign_vendor_links
ALTER TABLE public.campaign_vendor_links ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;
UPDATE public.campaign_vendor_links SET account_id = 'a0000000-0000-0000-0000-000000000001';
ALTER TABLE public.campaign_vendor_links ALTER COLUMN account_id SET NOT NULL;
-- Update unique constraint
ALTER TABLE public.campaign_vendor_links DROP CONSTRAINT IF EXISTS campaign_vendor_links_campaign_id_month_key;
ALTER TABLE public.campaign_vendor_links ADD CONSTRAINT campaign_vendor_links_account_campaign_month UNIQUE(account_id, campaign_id, month);

-- 5l. vendor_aliases
ALTER TABLE public.vendor_aliases ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;
UPDATE public.vendor_aliases SET account_id = 'a0000000-0000-0000-0000-000000000001';
ALTER TABLE public.vendor_aliases ALTER COLUMN account_id SET NOT NULL;
-- Update unique constraint
ALTER TABLE public.vendor_aliases DROP CONSTRAINT IF EXISTS vendor_aliases_alias_key;
ALTER TABLE public.vendor_aliases ADD CONSTRAINT vendor_aliases_account_alias UNIQUE(account_id, alias);

-- 5m. roleta_spins
ALTER TABLE public.roleta_spins ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;
UPDATE public.roleta_spins SET account_id = 'a0000000-0000-0000-0000-000000000001';
ALTER TABLE public.roleta_spins ALTER COLUMN account_id SET NOT NULL;
CREATE INDEX idx_roleta_spins_account_id ON public.roleta_spins(account_id);

-- 5n. fichas_rating
ALTER TABLE public.fichas_rating ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;
UPDATE public.fichas_rating SET account_id = 'a0000000-0000-0000-0000-000000000001';
ALTER TABLE public.fichas_rating ALTER COLUMN account_id SET NOT NULL;
CREATE INDEX idx_fichas_rating_account_id ON public.fichas_rating(account_id);

-- ============================================================
-- 6. Rewrite ALL RLS policies with account_id scoping
-- ============================================================

-- Helper subquery used in all policies:
-- account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid())

-- 6a. vendedores
DROP POLICY IF EXISTS "Authenticated users can read vendedores" ON public.vendedores;
DROP POLICY IF EXISTS "Admins can manage vendedores" ON public.vendedores;

CREATE POLICY "account_read_vendedores"
  ON public.vendedores FOR SELECT TO authenticated
  USING (account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid()));

CREATE POLICY "account_manage_vendedores"
  ON public.vendedores FOR ALL TO authenticated
  USING (
    account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

-- 6b. clientes
DROP POLICY IF EXISTS "Authenticated users can read clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins and managers can manage clientes" ON public.clientes;
DROP POLICY IF EXISTS "Sellers can insert clientes" ON public.clientes;
DROP POLICY IF EXISTS "Administrativo and Financeiro can manage clientes" ON public.clientes;

CREATE POLICY "account_read_clientes"
  ON public.clientes FOR SELECT TO authenticated
  USING (account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid()));

CREATE POLICY "account_manage_clientes"
  ON public.clientes FOR ALL TO authenticated
  USING (
    account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'manager')
      OR public.has_role(auth.uid(), 'administrativo')
      OR public.has_role(auth.uid(), 'financeiro')
    )
  );

CREATE POLICY "account_insert_clientes"
  ON public.clientes FOR INSERT TO authenticated
  WITH CHECK (
    account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid())
    AND public.has_role(auth.uid(), 'seller')
  );

-- 6c. company_settings
DROP POLICY IF EXISTS "Authenticated users can read settings" ON public.company_settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON public.company_settings;

CREATE POLICY "account_read_company_settings"
  ON public.company_settings FOR SELECT TO authenticated
  USING (account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid()));

CREATE POLICY "account_manage_company_settings"
  ON public.company_settings FOR ALL TO authenticated
  USING (
    account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- 6d. app_settings
DROP POLICY IF EXISTS "read_app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "write_app_settings" ON public.app_settings;

CREATE POLICY "account_read_app_settings"
  ON public.app_settings FOR SELECT TO authenticated
  USING (account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid()));

CREATE POLICY "account_write_app_settings"
  ON public.app_settings FOR ALL TO authenticated
  USING (account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid()));

-- 6e. meta_accounts
DROP POLICY IF EXISTS "Authenticated users can read meta_accounts" ON public.meta_accounts;
DROP POLICY IF EXISTS "Admins can manage meta_accounts" ON public.meta_accounts;

CREATE POLICY "account_read_meta_accounts"
  ON public.meta_accounts FOR SELECT TO authenticated
  USING (account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid()));

CREATE POLICY "account_manage_meta_accounts"
  ON public.meta_accounts FOR ALL TO authenticated
  USING (
    account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- 6f. nps_entries
DROP POLICY IF EXISTS "Authenticated users can read NPS" ON public.nps_entries;
DROP POLICY IF EXISTS "Admins and managers can manage NPS" ON public.nps_entries;

CREATE POLICY "account_read_nps_entries"
  ON public.nps_entries FOR SELECT TO authenticated
  USING (account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid()));

CREATE POLICY "account_manage_nps_entries"
  ON public.nps_entries FOR ALL TO authenticated
  USING (
    account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

-- 6g. commission_tiers
DROP POLICY IF EXISTS "Authenticated users can read commission_tiers" ON public.commission_tiers;
DROP POLICY IF EXISTS "Admins can manage commission_tiers" ON public.commission_tiers;

CREATE POLICY "account_read_commission_tiers"
  ON public.commission_tiers FOR SELECT TO authenticated
  USING (account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid()));

CREATE POLICY "account_manage_commission_tiers"
  ON public.commission_tiers FOR ALL TO authenticated
  USING (
    account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- 6h. custos_mensais
DROP POLICY IF EXISTS "Authenticated users can read custos_mensais" ON public.custos_mensais;
DROP POLICY IF EXISTS "Admins can manage custos_mensais" ON public.custos_mensais;

CREATE POLICY "account_read_custos_mensais"
  ON public.custos_mensais FOR SELECT TO authenticated
  USING (account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid()));

CREATE POLICY "account_manage_custos_mensais"
  ON public.custos_mensais FOR ALL TO authenticated
  USING (
    account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- 6i. monthly_goals
DROP POLICY IF EXISTS "Allow all on monthly_goals" ON public.monthly_goals;

CREATE POLICY "account_all_monthly_goals"
  ON public.monthly_goals FOR ALL TO authenticated
  USING (account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid()))
  WITH CHECK (account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid()));

-- 6j. vendor_monthly_goals
DROP POLICY IF EXISTS "Allow all on vendor_monthly_goals" ON public.vendor_monthly_goals;

CREATE POLICY "account_all_vendor_monthly_goals"
  ON public.vendor_monthly_goals FOR ALL TO authenticated
  USING (account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid()))
  WITH CHECK (account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid()));

-- 6k. campaign_vendor_links
DROP POLICY IF EXISTS "Authenticated users can read campaign_vendor_links" ON public.campaign_vendor_links;
DROP POLICY IF EXISTS "Admins can manage campaign_vendor_links" ON public.campaign_vendor_links;

CREATE POLICY "account_read_campaign_vendor_links"
  ON public.campaign_vendor_links FOR SELECT TO authenticated
  USING (account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid()));

CREATE POLICY "account_manage_campaign_vendor_links"
  ON public.campaign_vendor_links FOR ALL TO authenticated
  USING (
    account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- 6l. vendor_aliases
DROP POLICY IF EXISTS "Authenticated users can read vendor_aliases" ON public.vendor_aliases;
DROP POLICY IF EXISTS "Admins can manage vendor_aliases" ON public.vendor_aliases;

CREATE POLICY "account_read_vendor_aliases"
  ON public.vendor_aliases FOR SELECT TO authenticated
  USING (account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid()));

CREATE POLICY "account_manage_vendor_aliases"
  ON public.vendor_aliases FOR ALL TO authenticated
  USING (
    account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- 6m. roleta_spins
DROP POLICY IF EXISTS "Authenticated users can read roleta_spins" ON public.roleta_spins;
DROP POLICY IF EXISTS "Authenticated users can insert roleta_spins" ON public.roleta_spins;
DROP POLICY IF EXISTS "Admins can update roleta_spins" ON public.roleta_spins;

CREATE POLICY "account_read_roleta_spins"
  ON public.roleta_spins FOR SELECT TO authenticated
  USING (account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid()));

CREATE POLICY "account_insert_roleta_spins"
  ON public.roleta_spins FOR INSERT TO authenticated
  WITH CHECK (
    account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid())
    AND auth.uid() = created_by
  );

CREATE POLICY "account_update_roleta_spins"
  ON public.roleta_spins FOR UPDATE TO authenticated
  USING (
    account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- 6n. fichas_rating
DROP POLICY IF EXISTS "anon_insert_fichas_rating" ON public.fichas_rating;
DROP POLICY IF EXISTS "authenticated_select_fichas_rating" ON public.fichas_rating;
DROP POLICY IF EXISTS "admin_all_fichas_rating" ON public.fichas_rating;

-- Anon can insert with any account_id (the form passes it via URL param)
CREATE POLICY "anon_insert_fichas_rating"
  ON public.fichas_rating FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "account_read_fichas_rating"
  ON public.fichas_rating FOR SELECT TO authenticated
  USING (account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid()));

CREATE POLICY "account_manage_fichas_rating"
  ON public.fichas_rating FOR ALL TO authenticated
  USING (
    account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- ============================================================
-- 7. Duplicate company_settings defaults for account 2
-- ============================================================
INSERT INTO public.company_settings (key, value, account_id)
SELECT key, value, 'a0000000-0000-0000-0000-000000000002'
FROM public.company_settings
WHERE account_id = 'a0000000-0000-0000-0000-000000000001'
ON CONFLICT (account_id, key) DO NOTHING;

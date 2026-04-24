-- ============================================================
-- KOMMO INTEGRATION: leads + kommo_users tables
-- ============================================================

-- 1. Kommo user mapping (Kommo user_id → local vendedor)
CREATE TABLE public.kommo_users (
  id SERIAL PRIMARY KEY,
  kommo_user_id BIGINT NOT NULL,
  kommo_user_name TEXT,
  vendedor_id INTEGER NOT NULL REFERENCES public.vendedores(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, kommo_user_id)
);

ALTER TABLE public.kommo_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read kommo_users of their account"
  ON public.kommo_users FOR SELECT TO authenticated
  USING (account_id IN (SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage kommo_users"
  ON public.kommo_users FOR ALL TO authenticated
  USING (account_id IN (
    SELECT account_id FROM public.user_accounts
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- 2. Leads table (populated via Kommo webhooks)
CREATE TABLE public.leads (
  id SERIAL PRIMARY KEY,
  kommo_lead_id BIGINT,
  nome TEXT,
  telefone TEXT,
  email TEXT,
  vendedor_id INTEGER REFERENCES public.vendedores(id),
  vendedor_nome TEXT,
  source TEXT,
  campaign_name TEXT,
  status TEXT NOT NULL DEFAULT 'novo',
  kommo_status TEXT,
  kommo_pipeline_id BIGINT,
  valor NUMERIC NOT NULL DEFAULT 0,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, kommo_lead_id)
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read leads of their account"
  ON public.leads FOR SELECT TO authenticated
  USING (account_id IN (SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage leads"
  ON public.leads FOR ALL TO authenticated
  USING (account_id IN (
    SELECT account_id FROM public.user_accounts
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- Allow Edge Function (service_role) to insert/update leads
CREATE POLICY "Service role can manage leads"
  ON public.leads FOR ALL TO service_role
  USING (true);

CREATE POLICY "Service role can manage kommo_users"
  ON public.kommo_users FOR ALL TO service_role
  USING (true);

-- 3. Indexes for performance
CREATE INDEX idx_leads_account_created ON public.leads (account_id, created_at DESC);
CREATE INDEX idx_leads_account_vendedor ON public.leads (account_id, vendedor_id);
CREATE INDEX idx_leads_kommo_id ON public.leads (account_id, kommo_lead_id);

-- 4. Enable realtime for leads
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;

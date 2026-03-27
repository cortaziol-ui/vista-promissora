
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

-- Campaign-Vendor linking table
CREATE TABLE public.campaign_vendor_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  vendedor_id INTEGER REFERENCES public.vendedores(id) ON DELETE CASCADE,
  vendedor_nome TEXT,
  is_manual_override BOOLEAN NOT NULL DEFAULT false,
  month TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, month)
);

ALTER TABLE public.campaign_vendor_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read campaign_vendor_links"
  ON public.campaign_vendor_links FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage campaign_vendor_links"
  ON public.campaign_vendor_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Vendor aliases for automatic matching
CREATE TABLE public.vendor_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id INTEGER REFERENCES public.vendedores(id) ON DELETE CASCADE NOT NULL,
  alias TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(alias)
);

ALTER TABLE public.vendor_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read vendor_aliases"
  ON public.vendor_aliases FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage vendor_aliases"
  ON public.vendor_aliases FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed aliases
INSERT INTO public.vendor_aliases (vendedor_id, alias, priority) VALUES
  (1, 'BIANCA', 0),
  (2, 'NAYRA', 0),
  (5, 'LUCAS', 0),
  (7, 'MARTINS', 10),
  (4, 'GUSTAVO', 0);

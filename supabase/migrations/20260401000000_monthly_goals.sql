-- Monthly goals per company (meta_empresa_vendas, meta_comercial_vendas, meta_mensal)
CREATE TABLE IF NOT EXISTS monthly_goals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  month text NOT NULL,
  key text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(month, key)
);

-- Monthly goals per vendor
CREATE TABLE IF NOT EXISTS vendor_monthly_goals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  month text NOT NULL,
  vendedor_id integer NOT NULL REFERENCES vendedores(id) ON DELETE CASCADE,
  meta numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(month, vendedor_id)
);

-- Enable RLS
ALTER TABLE monthly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_monthly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on monthly_goals" ON monthly_goals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on vendor_monthly_goals" ON vendor_monthly_goals FOR ALL USING (true) WITH CHECK (true);

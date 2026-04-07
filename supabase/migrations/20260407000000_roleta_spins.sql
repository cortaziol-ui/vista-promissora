-- ============================================
-- Tabela para persistir giradas da roleta
-- ============================================

CREATE TABLE public.roleta_spins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor TEXT NOT NULL,
  motivo TEXT NOT NULL,
  motivo_titulo TEXT NOT NULL,
  premio TEXT NOT NULL,
  data TEXT NOT NULL,
  hora TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indice para rate limiting (vendedor + motivo + data desc)
CREATE INDEX idx_roleta_spins_rate_limit
  ON public.roleta_spins (vendedor, motivo, created_at DESC);

-- Indice para listagem ordenada
CREATE INDEX idx_roleta_spins_created_at
  ON public.roleta_spins (created_at DESC);

ALTER TABLE public.roleta_spins ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ler
CREATE POLICY "Authenticated users can read roleta_spins"
  ON public.roleta_spins FOR SELECT TO authenticated
  USING (true);

-- Autenticados podem inserir (created_by deve ser o proprio usuario)
CREATE POLICY "Authenticated users can insert roleta_spins"
  ON public.roleta_spins FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Apenas admin pode atualizar status
CREATE POLICY "Admins can update roleta_spins"
  ON public.roleta_spins FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

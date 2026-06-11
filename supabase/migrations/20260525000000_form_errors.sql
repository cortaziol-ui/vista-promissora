-- ============================================================
-- form_errors: log de falhas em formularios publicos (anon)
-- ============================================================
-- Toda vez que um formulario publico (ex.: ficha-rating) falha
-- ao gravar, o front insere uma linha aqui. Caio monitora em
-- /diagnostico-formularios pra detectar problema antes do
-- cliente reportar.
--
-- Anon insert: WITH CHECK true (mesmo padrao de fichas_rating)
-- Authenticated select: por account_id (RLS) — admin/manager veem da sua conta
-- ============================================================

CREATE TABLE IF NOT EXISTS public.form_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  form_name TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT NOT NULL,
  error_details TEXT,
  error_hint TEXT,
  user_agent TEXT,
  url TEXT,
  payload_preview JSONB,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_errors_account_created
  ON public.form_errors(account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_form_errors_unresolved
  ON public.form_errors(account_id, resolved, created_at DESC)
  WHERE resolved = false;

ALTER TABLE public.form_errors ENABLE ROW LEVEL SECURITY;

-- Anon: pode inserir (logger de erro nao pode ser bloqueado por RLS)
CREATE POLICY "anon_insert_form_errors"
  ON public.form_errors FOR INSERT TO anon
  WITH CHECK (true);

-- Authenticated insert tambem permitido (caso usuario logado dispare submit)
CREATE POLICY "authenticated_insert_form_errors"
  ON public.form_errors FOR INSERT TO authenticated
  WITH CHECK (true);

-- Authenticated: ve apenas erros da sua propria account
CREATE POLICY "account_read_form_errors"
  ON public.form_errors FOR SELECT TO authenticated
  USING (
    account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid())
  );

-- Admin/manager da account podem marcar como resolvido
CREATE POLICY "account_update_form_errors"
  ON public.form_errors FOR UPDATE TO authenticated
  USING (
    account_id IN (SELECT ua.account_id FROM public.user_accounts ua WHERE ua.user_id = auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

COMMENT ON TABLE public.form_errors IS
  'Log de falhas em formularios publicos (ficha-rating, etc). Anon insere; admin/manager da account monitora em /diagnostico-formularios.';

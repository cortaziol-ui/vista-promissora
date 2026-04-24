-- ==============================================================================
-- Migration 001 — google_oauth_tokens
-- ==============================================================================
-- Propósito: guardar refresh_token OAuth do Google Ads (1 row, uso interno Beaver).
--            O access_token é gerado on-demand pelas Vercel Functions usando o
--            refresh_token — por isso só precisamos persistir o refresh.
--
-- Como aplicar:
--   Opção A — Supabase Dashboard:
--     app.supabase.com → Project → SQL Editor → colar conteúdo → Run
--   Opção B — Supabase CLI:
--     supabase db push
--   Opção C — psql:
--     psql <connection_string> -f supabase/migrations/001_google_oauth_tokens.sql
-- ==============================================================================

-- Cria a tabela (idempotente — não recria se já existir)
CREATE TABLE IF NOT EXISTS public.google_oauth_tokens (
  id INTEGER PRIMARY KEY DEFAULT 1,
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  expires_at TIMESTAMPTZ,
  scope TEXT,
  token_type TEXT DEFAULT 'Bearer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Garante row única (id sempre = 1)
  CONSTRAINT only_one_row CHECK (id = 1)
);

COMMENT ON TABLE public.google_oauth_tokens IS
  'Store do refresh_token OAuth do Google Ads. Sempre 1 row (id=1). Escrito pelo handler OAuth callback, lido pelo google-auth.ts no refresh flow.';

-- Ativar Row Level Security (defesa em profundidade)
ALTER TABLE public.google_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Política: apenas service_role (usado pelas Vercel Functions) pode ler/escrever
-- O anon key do frontend NUNCA acessa essa tabela (tokens ficam só server-side)
DROP POLICY IF EXISTS "service_role_all" ON public.google_oauth_tokens;
CREATE POLICY "service_role_all" ON public.google_oauth_tokens
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Trigger pra atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_google_oauth_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_google_oauth_tokens ON public.google_oauth_tokens;
CREATE TRIGGER set_updated_at_google_oauth_tokens
  BEFORE UPDATE ON public.google_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_google_oauth_tokens_updated_at();

-- Index pra reads rápidos (única row, mas bom hábito)
CREATE INDEX IF NOT EXISTS idx_google_oauth_tokens_updated_at
  ON public.google_oauth_tokens (updated_at DESC);

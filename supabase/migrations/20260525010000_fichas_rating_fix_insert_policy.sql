-- ============================================================
-- Fix: erro 42501 (RLS) ao enviar /ficha-rating em producao
-- ============================================================
-- Sintoma: cliente preenche o form publico e ao submeter recebe
-- 'new row violates row-level security policy for table "fichas_rating"'
-- (codigo PostgREST: 42501).
--
-- Causa: o supabase client (src/integrations/supabase/client.ts) usa
-- persistSession: true + localStorage. Se o navegador ja tem sessao
-- (Caio testando logado, ou cliente que ja navegou autenticado),
-- o INSERT vai como `authenticated` em vez de `anon`. Sem policy
-- de INSERT pra `authenticated`, cai na policy `account_manage_*`
-- que exige role admin — e qualquer outro usuario eh rejeitado.
--
-- Fix: garante que QUALQUER caller (anon OU authenticated) pode
-- inserir no formulario publico. RLS de leitura/update continua
-- escopada por account.
-- ============================================================

-- Idempotente: dropa e recria a policy anon (defesa contra drift)
DROP POLICY IF EXISTS "anon_insert_fichas_rating" ON public.fichas_rating;
CREATE POLICY "anon_insert_fichas_rating"
  ON public.fichas_rating FOR INSERT TO anon
  WITH CHECK (true);

-- Nova: authenticated tambem pode inserir (forms publicos abertos em
-- navegadores com sessao ativa). Mesma logica do form anonimo —
-- account_id eh resolvido pelo front via slug/query param.
DROP POLICY IF EXISTS "authenticated_insert_fichas_rating" ON public.fichas_rating;
CREATE POLICY "authenticated_insert_fichas_rating"
  ON public.fichas_rating FOR INSERT TO authenticated
  WITH CHECK (true);

-- Storage: mesma defesa pro bucket de anexos
DROP POLICY IF EXISTS "anon_upload_fichas_anexos" ON storage.objects;
CREATE POLICY "anon_upload_fichas_anexos"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'fichas-anexos');

DROP POLICY IF EXISTS "authenticated_upload_fichas_anexos" ON storage.objects;
CREATE POLICY "authenticated_upload_fichas_anexos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fichas-anexos');

COMMENT ON POLICY "authenticated_insert_fichas_rating" ON public.fichas_rating IS
  'Formulario publico /ficha-rating pode ser submetido tambem por sessao authenticated (Caio testando, ou cliente com sessao residual no navegador). Restricao por account fica no SELECT/UPDATE.';

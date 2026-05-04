-- ============================================================
-- Listas de Parceiros (réplica do sisteminha M12 / LikeMax)
-- ============================================================
-- Inspirada em https://listasparceirosm12.netlify.app/
-- Cada "lista" representa uma leva semanal de processos coletivos
-- enviada pelos parceiros (default: toda sexta-feira). Cada lista
-- tem N órgãos (SERASA, SPC, BOA VISTA, CENPROT SP, CENPROT NACIONAL)
-- com status próprio + datas de protocolo / recepção / baixa.
--
-- Slug público: token random gerado no insert. Permite que o admin
-- gere um link compartilhável (/lista/<slug>) para o cliente final
-- acompanhar SEM precisar logar.

-- ===== Tabela principal: lista (uma por semana) =====
CREATE TABLE public.listas_parceiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  -- 'andamento' | 'baixado' | 'reprotocolo'
  status_geral TEXT NOT NULL DEFAULT 'andamento'
    CHECK (status_geral IN ('andamento', 'baixado', 'reprotocolo')),
  -- token público para gerar link compartilhável
  slug_publico TEXT NOT NULL UNIQUE
    DEFAULT lower(replace(gen_random_uuid()::text, '-', '')),
  data_lista DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes TEXT,
  ultima_atualizacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_listas_parceiros_account ON public.listas_parceiros (account_id, data_lista DESC);
CREATE INDEX idx_listas_parceiros_slug ON public.listas_parceiros (slug_publico);

-- ===== Tabela filha: status por órgão dentro da lista =====
CREATE TABLE public.listas_parceiros_orgaos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id UUID NOT NULL REFERENCES public.listas_parceiros(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  -- 'aguardando' | 'iniciadas' | 'concluidas' | 'protocolo'
  status TEXT NOT NULL DEFAULT 'aguardando'
    CHECK (status IN ('aguardando', 'iniciadas', 'concluidas', 'protocolo')),
  protocolo_data DATE,
  protocolo_hora TEXT,
  recepcionado_data DATE,
  recepcionado_hora TEXT,
  iniciadas_data DATE,
  iniciadas_hora TEXT,
  concluidas_data DATE,
  concluidas_hora TEXT,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lista_id, nome)
);

CREATE INDEX idx_listas_orgaos_lista ON public.listas_parceiros_orgaos (lista_id, ordem);

-- ===== RLS: leitura/escrita autenticada por account =====
ALTER TABLE public.listas_parceiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listas_parceiros_orgaos ENABLE ROW LEVEL SECURITY;

-- Listas: usuário autenticado lê suas accounts; admin/manager gerenciam.
CREATE POLICY "auth_read_listas_parceiros"
  ON public.listas_parceiros FOR SELECT TO authenticated
  USING (account_id IN (SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid()));

CREATE POLICY "admin_manager_manage_listas_parceiros"
  ON public.listas_parceiros FOR ALL TO authenticated
  USING (account_id IN (
    SELECT account_id FROM public.user_accounts
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ))
  WITH CHECK (account_id IN (
    SELECT account_id FROM public.user_accounts
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- Órgãos: leitura/escrita seguem a lista pai
CREATE POLICY "auth_read_listas_orgaos"
  ON public.listas_parceiros_orgaos FOR SELECT TO authenticated
  USING (lista_id IN (
    SELECT id FROM public.listas_parceiros
    WHERE account_id IN (SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid())
  ));

CREATE POLICY "admin_manager_manage_listas_orgaos"
  ON public.listas_parceiros_orgaos FOR ALL TO authenticated
  USING (lista_id IN (
    SELECT id FROM public.listas_parceiros
    WHERE account_id IN (
      SELECT account_id FROM public.user_accounts
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  ))
  WITH CHECK (lista_id IN (
    SELECT id FROM public.listas_parceiros
    WHERE account_id IN (
      SELECT account_id FROM public.user_accounts
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  ));

-- ===== Acesso público (anon) via slug_publico =====
-- O cliente final acessa /lista/<slug> sem login. Liberamos SELECT pra anon
-- somente em listas que tenham slug_publico (todas têm), e nos órgãos cujas
-- listas existam. Sem INSERT/UPDATE/DELETE pra anon.
CREATE POLICY "public_read_listas_parceiros"
  ON public.listas_parceiros FOR SELECT TO anon
  USING (slug_publico IS NOT NULL);

CREATE POLICY "public_read_listas_orgaos"
  ON public.listas_parceiros_orgaos FOR SELECT TO anon
  USING (lista_id IN (SELECT id FROM public.listas_parceiros));

-- ===== Triggers de updated_at =====
CREATE OR REPLACE FUNCTION public.touch_listas_parceiros_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  NEW.ultima_atualizacao := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_listas_parceiros_updated
  BEFORE UPDATE ON public.listas_parceiros
  FOR EACH ROW EXECUTE FUNCTION public.touch_listas_parceiros_updated_at();

CREATE OR REPLACE FUNCTION public.touch_listas_orgaos_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  -- toca a lista pai pra refletir "última atualização"
  UPDATE public.listas_parceiros
    SET ultima_atualizacao = now()
    WHERE id = NEW.lista_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_listas_orgaos_updated
  BEFORE UPDATE ON public.listas_parceiros_orgaos
  FOR EACH ROW EXECUTE FUNCTION public.touch_listas_orgaos_updated_at();

-- ===== Realtime =====
ALTER PUBLICATION supabase_realtime ADD TABLE public.listas_parceiros;
ALTER PUBLICATION supabase_realtime ADD TABLE public.listas_parceiros_orgaos;

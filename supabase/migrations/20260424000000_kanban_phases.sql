-- ============================================================
-- Kanban phases dinâmicas (por account/subconta)
-- ============================================================
-- Permite que admins criem, editem, removam e reordenem fases do
-- Kanban de Pós-venda via UI. Antes: 6 fases hardcoded no front.
--
-- phase_n: identificador estável por account. Usado como index em
--          clientes.contatos[].n. NUNCA é alterado após criação
--          (renumerar quebraria registros existentes).
-- ordem:   posição de exibição (1..N). Reordenação não mexe em phase_n.
-- trigger_type: 'manual' | 'apos_venda' | 'apos_fase'
--   - manual:     card movido manualmente, sem data automática
--   - apos_venda: data da fase = data da venda + trigger_days
--   - apos_fase:  data da fase = data de conclusão da fase trigger_ref_phase_n + trigger_days

CREATE TABLE public.kanban_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  phase_n INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  gatilho TEXT NOT NULL DEFAULT 'Manual',
  trigger_type TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'apos_venda', 'apos_fase')),
  trigger_days INTEGER,
  trigger_ref_phase_n INTEGER,
  ordem INTEGER NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, phase_n)
);

CREATE INDEX idx_kanban_phases_account_ordem ON public.kanban_phases (account_id, ordem);

ALTER TABLE public.kanban_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read kanban_phases of their account"
  ON public.kanban_phases FOR SELECT TO authenticated
  USING (account_id IN (SELECT account_id FROM public.user_accounts WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage kanban_phases"
  ON public.kanban_phases FOR ALL TO authenticated
  USING (account_id IN (
    SELECT account_id FROM public.user_accounts
    WHERE user_id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (account_id IN (
    SELECT account_id FROM public.user_accounts
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Trigger pra manter updated_at automaticamente
CREATE OR REPLACE FUNCTION public.touch_kanban_phases_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_kanban_phases_updated_at
  BEFORE UPDATE ON public.kanban_phases
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_kanban_phases_updated_at();

-- Seed: 7 fases default em TODAS as accounts existentes
-- Inclui a nova "Cobrança 1ª parcela" (phase_n=7) em ordem 4, entre
-- "Entrega do serviço" e "Pós-pagamento".
-- phase_n mantido: 1..6 para os 6 contatos já existentes em clientes.contatos;
-- 7 é novo e clientes antigos recebem contato[n=7] via ensureContatos no front.
INSERT INTO public.kanban_phases (account_id, phase_n, titulo, gatilho, trigger_type, trigger_days, trigger_ref_phase_n, ordem)
SELECT a.id, 1, 'Boas-vindas',                '+1 dia',                   'apos_venda', 1,    NULL, 1 FROM public.accounts a
UNION ALL
SELECT a.id, 2, 'Acompanhamento',             '+15 dias',                 'apos_venda', 15,   NULL, 2 FROM public.accounts a
UNION ALL
SELECT a.id, 3, 'Entrega do serviço',         'Manual',                   'manual',     NULL, NULL, 3 FROM public.accounts a
UNION ALL
SELECT a.id, 7, 'Cobrança 1ª parcela',        'Manual',                   'manual',     NULL, NULL, 4 FROM public.accounts a
UNION ALL
SELECT a.id, 4, 'Pós-pagamento',              'Manual',                   'manual',     NULL, NULL, 5 FROM public.accounts a
UNION ALL
SELECT a.id, 5, 'Upsell',                     '+15 dias após entrega',    'apos_fase',  15,   3,    6 FROM public.accounts a
UNION ALL
SELECT a.id, 6, 'Cobrança 2ª parcela',        '+30 dias após entrega',    'apos_fase',  30,   3,    7 FROM public.accounts a;

-- Habilita realtime pra que os clients recebam mudanças ao vivo
ALTER PUBLICATION supabase_realtime ADD TABLE public.kanban_phases;

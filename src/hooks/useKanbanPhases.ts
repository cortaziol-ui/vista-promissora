import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

export type TriggerType = 'manual' | 'apos_venda' | 'apos_fase';

export interface KanbanPhase {
  id: string;
  account_id: string;
  phase_n: number;
  titulo: string;
  gatilho: string;
  trigger_type: TriggerType;
  trigger_days: number | null;
  trigger_ref_phase_n: number | null;
  ordem: number;
  ativo: boolean;
}

export interface NewPhaseInput {
  titulo: string;
  trigger_type: TriggerType;
  trigger_days?: number | null;
  trigger_ref_phase_n?: number | null;
  ordem?: number;
}

export interface UpdatePhaseInput {
  titulo?: string;
  trigger_type?: TriggerType;
  trigger_days?: number | null;
  trigger_ref_phase_n?: number | null;
  ordem?: number;
  ativo?: boolean;
}

function buildGatilho(
  trigger_type: TriggerType,
  trigger_days: number | null | undefined,
  trigger_ref_phase_n: number | null | undefined,
  refTitle?: string
): string {
  if (trigger_type === 'manual') return 'Manual';
  if (trigger_type === 'apos_venda') return `+${trigger_days ?? 0} dia${(trigger_days ?? 0) === 1 ? '' : 's'}`;
  if (trigger_type === 'apos_fase') {
    const base = `+${trigger_days ?? 0} dias`;
    return refTitle ? `${base} após ${refTitle.toLowerCase()}` : `${base} após fase ${trigger_ref_phase_n ?? '?'}`;
  }
  return 'Manual';
}

interface UseKanbanPhasesResult {
  phases: KanbanPhase[];
  loading: boolean;
  addPhase: (input: NewPhaseInput) => Promise<KanbanPhase | null>;
  updatePhase: (id: string, input: UpdatePhaseInput) => Promise<boolean>;
  deletePhase: (id: string) => Promise<boolean>;
  reorderPhases: (orderedIds: string[]) => Promise<boolean>;
}

export function useKanbanPhases(): UseKanbanPhasesResult {
  const { activeAccountId } = useTenant();
  const [phases, setPhases] = useState<KanbanPhase[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPhases = useCallback(async () => {
    if (!activeAccountId) {
      setPhases([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('kanban_phases')
      .select('*')
      .eq('account_id', activeAccountId)
      .eq('ativo', true)
      .order('ordem', { ascending: true });
    if (error) {
      console.error('[useKanbanPhases] fetch error:', error);
      setPhases([]);
    } else {
      setPhases((data ?? []) as KanbanPhase[]);
    }
    setLoading(false);
  }, [activeAccountId]);

  useEffect(() => {
    setLoading(true);
    fetchPhases();
  }, [fetchPhases]);

  // Realtime: refaz o fetch quando qualquer mudança ocorre em kanban_phases da account
  useEffect(() => {
    if (!activeAccountId) return;
    const channel = supabase
      .channel(`kanban_phases_${activeAccountId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kanban_phases', filter: `account_id=eq.${activeAccountId}` },
        () => { fetchPhases(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeAccountId, fetchPhases]);

  const addPhase = useCallback(async (input: NewPhaseInput): Promise<KanbanPhase | null> => {
    if (!activeAccountId) return null;
    // Próximo phase_n = max(phase_n) + 1 das fases atuais (ativas ou não)
    const { data: existing } = await supabase
      .from('kanban_phases')
      .select('phase_n, ordem')
      .eq('account_id', activeAccountId);
    const nextPhaseN = (existing?.reduce((m, r) => Math.max(m, r.phase_n), 0) ?? 0) + 1;
    const nextOrdem = input.ordem ?? ((existing?.reduce((m, r) => Math.max(m, r.ordem), 0) ?? 0) + 1);
    const refTitle = input.trigger_ref_phase_n != null
      ? phases.find(p => p.phase_n === input.trigger_ref_phase_n)?.titulo
      : undefined;

    const payload = {
      account_id: activeAccountId,
      phase_n: nextPhaseN,
      titulo: input.titulo,
      trigger_type: input.trigger_type,
      trigger_days: input.trigger_days ?? null,
      trigger_ref_phase_n: input.trigger_ref_phase_n ?? null,
      ordem: nextOrdem,
      gatilho: buildGatilho(input.trigger_type, input.trigger_days, input.trigger_ref_phase_n, refTitle),
      ativo: true,
    };
    const { data, error } = await supabase
      .from('kanban_phases')
      .insert(payload)
      .select()
      .single();
    if (error) { console.error('[useKanbanPhases] addPhase error:', error); return null; }
    return data as KanbanPhase;
  }, [activeAccountId, phases]);

  const updatePhase = useCallback(async (id: string, input: UpdatePhaseInput): Promise<boolean> => {
    if (!activeAccountId) return false;
    const current = phases.find(p => p.id === id);
    if (!current) return false;
    const trigger_type = input.trigger_type ?? current.trigger_type;
    const trigger_days = input.trigger_days !== undefined ? input.trigger_days : current.trigger_days;
    const trigger_ref_phase_n = input.trigger_ref_phase_n !== undefined ? input.trigger_ref_phase_n : current.trigger_ref_phase_n;
    const refTitle = trigger_ref_phase_n != null
      ? phases.find(p => p.phase_n === trigger_ref_phase_n)?.titulo
      : undefined;
    const payload: Record<string, unknown> = {};
    if (input.titulo !== undefined) payload.titulo = input.titulo;
    if (input.trigger_type !== undefined) payload.trigger_type = trigger_type;
    if (input.trigger_days !== undefined) payload.trigger_days = trigger_days;
    if (input.trigger_ref_phase_n !== undefined) payload.trigger_ref_phase_n = trigger_ref_phase_n;
    if (input.ordem !== undefined) payload.ordem = input.ordem;
    if (input.ativo !== undefined) payload.ativo = input.ativo;
    // Recalcula gatilho sempre que mudar algo relacionado
    if (
      input.trigger_type !== undefined ||
      input.trigger_days !== undefined ||
      input.trigger_ref_phase_n !== undefined
    ) {
      payload.gatilho = buildGatilho(trigger_type, trigger_days, trigger_ref_phase_n, refTitle);
    }
    const { error } = await supabase
      .from('kanban_phases')
      .update(payload)
      .eq('id', id)
      .eq('account_id', activeAccountId);
    if (error) { console.error('[useKanbanPhases] updatePhase error:', error); return false; }
    return true;
  }, [activeAccountId, phases]);

  const deletePhase = useCallback(async (id: string): Promise<boolean> => {
    if (!activeAccountId) return false;
    // Soft delete: marca ativo=false pra não perder histórico e preservar referências em contatos
    const { error } = await supabase
      .from('kanban_phases')
      .update({ ativo: false })
      .eq('id', id)
      .eq('account_id', activeAccountId);
    if (error) { console.error('[useKanbanPhases] deletePhase error:', error); return false; }
    return true;
  }, [activeAccountId]);

  const reorderPhases = useCallback(async (orderedIds: string[]): Promise<boolean> => {
    if (!activeAccountId) return false;
    // Atualiza ordem de cada fase com base na posição no array
    const updates = orderedIds.map((id, idx) =>
      supabase
        .from('kanban_phases')
        .update({ ordem: idx + 1 })
        .eq('id', id)
        .eq('account_id', activeAccountId)
    );
    const results = await Promise.all(updates);
    const hasError = results.some(r => r.error);
    if (hasError) {
      console.error('[useKanbanPhases] reorderPhases error:', results.filter(r => r.error).map(r => r.error));
      return false;
    }
    return true;
  }, [activeAccountId]);

  return { phases, loading, addPhase, updatePhase, deletePhase, reorderPhases };
}

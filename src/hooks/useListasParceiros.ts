import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

export type StatusGeral = 'andamento' | 'baixado' | 'reprotocolo';
export type StatusOrgao = 'aguardando' | 'iniciadas' | 'concluidas' | 'protocolo';

export const ORGAOS_FIXOS = ['SERASA', 'SPC', 'BOA VISTA', 'CENPROT SP', 'CENPROT NACIONAL'] as const;

export interface ListaOrgao {
  id: string;
  lista_id: string;
  nome: string;
  status: StatusOrgao;
  protocolo_data: string | null;
  protocolo_hora: string | null;
  recepcionado_data: string | null;
  recepcionado_hora: string | null;
  iniciadas_data: string | null;
  iniciadas_hora: string | null;
  concluidas_data: string | null;
  concluidas_hora: string | null;
  descricao: string | null;
  ordem: number;
}

export interface ListaParceiros {
  id: string;
  account_id: string;
  titulo: string;
  status_geral: StatusGeral;
  slug_publico: string;
  data_lista: string;
  observacoes: string | null;
  ultima_atualizacao: string;
  created_at: string;
  orgaos: ListaOrgao[];
}

export const STATUS_GERAL_LABEL: Record<StatusGeral, string> = {
  andamento: 'Em andamento',
  baixado: '100% baixado',
  reprotocolo: 'Reprotocolo',
};

export const STATUS_ORGAO_LABEL: Record<StatusOrgao, string> = {
  aguardando: 'Aguardando início das baixas',
  iniciadas: 'Baixas iniciadas',
  concluidas: 'Baixas concluídas',
  protocolo: 'Em reprotocolo',
};

// Texto default exibido no card quando o admin não cadastra descrição manual.
// Inspirado nos textos do sisteminha M12. Quebras de linha viram <br>.
export const DESCRICAO_DEFAULT_POR_STATUS: Record<StatusOrgao, string> = {
  aguardando: 'As informações detalhadas sobre este órgão serão atualizadas aqui pela equipe Out.com.',
  iniciadas:
    '⚠️ Atenção: utilize consultas atualizadas 🔍\n' +
    'Isso significa que alguns nomes podem já constar como limpos em consultas atualizadas.\n' +
    '(Não confirmado baixa total!)\n' +
    'Os aplicativos podem levar até 48h após a baixa total para constar baixa. ⏳',
  concluidas:
    '✅ Baixas concluídas neste órgão.\n' +
    'Os aplicativos de consulta podem levar até 48h para refletir a atualização total. ⏳',
  protocolo:
    'Alguns nomes podem retornar temporariamente aos órgãos devido a um ajuste processual estratégico.\n' +
    'Já estamos incluindo todos novamente para refazer na próxima semana.\n' +
    '(Em caso de dúvidas, busque seu consultor Out.com.)',
};

// Gera o título default "Lista DD/MM" usando a próxima sexta a partir de hoje.
// Se já for sexta, usa hoje.
export function tituloDefaultProximaSexta(base = new Date()): { titulo: string; dataIso: string } {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=dom..6=sab; 5=sex
  const diff = (5 - dow + 7) % 7; // dias até sexta (0 se já é sexta)
  d.setDate(d.getDate() + diff);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return {
    titulo: `Lista ${dd}/${mm}`,
    dataIso: `${yyyy}-${mm}-${dd}`,
  };
}

type ListaPatch = Partial<Pick<ListaParceiros, 'titulo' | 'status_geral' | 'observacoes' | 'data_lista'>>;
type OrgaoPatch = Partial<Omit<ListaOrgao, 'id' | 'lista_id' | 'nome' | 'ordem'>>;

interface UseListasResult {
  listas: ListaParceiros[];
  loading: boolean;
  createLista: (input?: { titulo?: string; data?: string }) => Promise<ListaParceiros | null>;
  updateLista: (id: string, patch: ListaPatch) => Promise<boolean>;
  deleteLista: (id: string) => Promise<boolean>;
  updateOrgao: (orgaoId: string, patch: OrgaoPatch) => Promise<boolean>;
  /** Atualiza lista + N órgãos em paralelo. Optimistic + rollback. */
  saveListaBatch: (
    listaId: string,
    listaPatch: ListaPatch | null,
    orgaosPatches: Record<string, OrgaoPatch>,
  ) => Promise<boolean>;
  /** Marca uma lista como "em edição" — durante esse período o realtime ignora updates dela (não sobrescreve drafts do usuário). */
  setEditingListaId: (id: string | null) => void;
}

export function useListasParceiros(): UseListasResult {
  const { activeAccountId } = useTenant();
  const [listas, setListas] = useState<ListaParceiros[]>([]);
  const [loading, setLoading] = useState(true);
  // Ref pra realtime saber se uma lista está sendo editada localmente (evita refetch que sobrescreveria draft).
  const editingListaIdRef = useRef<string | null>(null);
  const setEditingListaId = useCallback((id: string | null) => {
    editingListaIdRef.current = id;
  }, []);

  const fetchAll = useCallback(async () => {
    if (!activeAccountId) {
      setListas([]);
      setLoading(false);
      return;
    }
    const { data: listasData, error: errListas } = await supabase
      .from('listas_parceiros')
      .select('*')
      .eq('account_id', activeAccountId)
      .order('data_lista', { ascending: false })
      .order('created_at', { ascending: false });

    if (errListas) {
      console.error('[useListasParceiros] fetch listas error:', errListas);
      setListas([]);
      setLoading(false);
      return;
    }

    const ids = (listasData ?? []).map((l) => l.id);
    let orgaosByLista: Record<string, ListaOrgao[]> = {};
    if (ids.length > 0) {
      const { data: orgaosData, error: errOrgaos } = await supabase
        .from('listas_parceiros_orgaos')
        .select('*')
        .in('lista_id', ids)
        .order('ordem', { ascending: true });
      if (errOrgaos) {
        console.error('[useListasParceiros] fetch orgaos error:', errOrgaos);
      } else {
        orgaosByLista = (orgaosData ?? []).reduce<Record<string, ListaOrgao[]>>((acc, o) => {
          (acc[o.lista_id] = acc[o.lista_id] || []).push(o as ListaOrgao);
          return acc;
        }, {});
      }
    }

    const merged: ListaParceiros[] = (listasData ?? []).map((l) => ({
      ...(l as Omit<ListaParceiros, 'orgaos'>),
      orgaos: orgaosByLista[l.id] ?? [],
    }));
    setListas(merged);
    setLoading(false);
  }, [activeAccountId]);

  useEffect(() => {
    setLoading(true);
    fetchAll();
  }, [fetchAll]);

  // Realtime: refaz fetch ao mudar lista ou órgão.
  // Ignora se usuário está editando localmente — refetch sobrescreveria drafts.
  useEffect(() => {
    if (!activeAccountId) return;
    const onChange = () => {
      if (editingListaIdRef.current) return;
      fetchAll();
    };
    const channel = supabase
      .channel(`listas_parceiros_${activeAccountId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listas_parceiros', filter: `account_id=eq.${activeAccountId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listas_parceiros_orgaos' }, onChange)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeAccountId, fetchAll]);

  const createLista = useCallback(async (input?: { titulo?: string; data?: string }): Promise<ListaParceiros | null> => {
    if (!activeAccountId) return null;
    const auto = tituloDefaultProximaSexta();
    const titulo = input?.titulo ?? auto.titulo;
    const dataIso = input?.data ?? auto.dataIso;

    const { data: novaLista, error } = await supabase
      .from('listas_parceiros')
      .insert({ account_id: activeAccountId, titulo, data_lista: dataIso })
      .select()
      .single();

    if (error || !novaLista) {
      console.error('[useListasParceiros] createLista error:', error);
      return null;
    }

    // Cria os 5 órgãos fixos
    const orgaosPayload = ORGAOS_FIXOS.map((nome, idx) => ({
      lista_id: novaLista.id,
      nome,
      ordem: idx,
    }));
    const { data: novosOrgaos, error: errOrgaos } = await supabase
      .from('listas_parceiros_orgaos')
      .insert(orgaosPayload)
      .select();
    if (errOrgaos) {
      console.error('[useListasParceiros] insert orgaos error:', errOrgaos);
    }

    // Optimistic: insere a nova lista no topo do state imediatamente
    const listaCompleta: ListaParceiros = {
      ...(novaLista as Omit<ListaParceiros, 'orgaos'>),
      orgaos: (novosOrgaos ?? []) as ListaOrgao[],
    };
    setListas((prev) => [listaCompleta, ...prev]);
    return listaCompleta;
  }, [activeAccountId]);

  const updateLista = useCallback(async (id: string, patch: Partial<Pick<ListaParceiros, 'titulo' | 'status_geral' | 'observacoes' | 'data_lista'>>): Promise<boolean> => {
    if (!activeAccountId) return false;
    // Optimistic update: aplica no state imediatamente
    const nowIso = new Date().toISOString();
    let snapshot: ListaParceiros[] = [];
    setListas((prev) => {
      snapshot = prev;
      return prev.map((l) => (l.id === id ? { ...l, ...patch, ultima_atualizacao: nowIso } : l));
    });

    const { error } = await supabase
      .from('listas_parceiros')
      .update(patch)
      .eq('id', id)
      .eq('account_id', activeAccountId);
    if (error) {
      console.error('[useListasParceiros] updateLista error:', error);
      setListas(snapshot); // rollback
      return false;
    }
    return true;
  }, [activeAccountId]);

  const deleteLista = useCallback(async (id: string): Promise<boolean> => {
    if (!activeAccountId) return false;
    let snapshot: ListaParceiros[] = [];
    setListas((prev) => {
      snapshot = prev;
      return prev.filter((l) => l.id !== id);
    });
    const { error } = await supabase
      .from('listas_parceiros')
      .delete()
      .eq('id', id)
      .eq('account_id', activeAccountId);
    if (error) {
      console.error('[useListasParceiros] deleteLista error:', error);
      setListas(snapshot); // rollback
      return false;
    }
    return true;
  }, [activeAccountId]);

  const updateOrgao = useCallback(async (orgaoId: string, patch: Partial<Omit<ListaOrgao, 'id' | 'lista_id' | 'nome' | 'ordem'>>): Promise<boolean> => {
    // Optimistic update no órgão + ultima_atualizacao da lista pai
    const nowIso = new Date().toISOString();
    let snapshot: ListaParceiros[] = [];
    setListas((prev) => {
      snapshot = prev;
      return prev.map((l) => {
        const idx = l.orgaos.findIndex((o) => o.id === orgaoId);
        if (idx === -1) return l;
        const novosOrgaos = [...l.orgaos];
        novosOrgaos[idx] = { ...novosOrgaos[idx], ...patch };
        return { ...l, orgaos: novosOrgaos, ultima_atualizacao: nowIso };
      });
    });

    const { error } = await supabase
      .from('listas_parceiros_orgaos')
      .update(patch)
      .eq('id', orgaoId);
    if (error) {
      console.error('[useListasParceiros] updateOrgao error:', error);
      setListas(snapshot); // rollback
      return false;
    }
    return true;
  }, []);

  const saveListaBatch = useCallback(async (
    listaId: string,
    listaPatch: ListaPatch | null,
    orgaosPatches: Record<string, OrgaoPatch>,
  ): Promise<boolean> => {
    if (!activeAccountId) return false;

    // Optimistic merge no state local (1 só re-render)
    const nowIso = new Date().toISOString();
    let snapshot: ListaParceiros[] = [];
    setListas((prev) => {
      snapshot = prev;
      return prev.map((l) => {
        if (l.id !== listaId) return l;
        const novosOrgaos = l.orgaos.map((o) => {
          const patch = orgaosPatches[o.id];
          return patch ? { ...o, ...patch } : o;
        });
        return {
          ...l,
          ...(listaPatch ?? {}),
          orgaos: novosOrgaos,
          ultima_atualizacao: nowIso,
        };
      });
    });

    // Dispara updates em paralelo. PostgrestBuilder é thenable; envolvo em Promise.resolve pra normalizar.
    const promises: Promise<{ error: unknown }>[] = [];
    if (listaPatch && Object.keys(listaPatch).length > 0) {
      promises.push(
        Promise.resolve(
          supabase
            .from('listas_parceiros')
            .update(listaPatch)
            .eq('id', listaId)
            .eq('account_id', activeAccountId),
        ).then((res) => ({ error: res.error as unknown })),
      );
    }
    for (const [orgaoId, patch] of Object.entries(orgaosPatches)) {
      if (Object.keys(patch).length === 0) continue;
      promises.push(
        Promise.resolve(
          supabase.from('listas_parceiros_orgaos').update(patch).eq('id', orgaoId),
        ).then((res) => ({ error: res.error as unknown })),
      );
    }

    const results = await Promise.all(promises);
    const firstError = results.find((r) => r.error)?.error;
    if (firstError) {
      console.error('[useListasParceiros] saveListaBatch error:', firstError);
      setListas(snapshot); // rollback
      return false;
    }
    return true;
  }, [activeAccountId]);

  return {
    listas,
    loading,
    createLista,
    updateLista,
    deleteLista,
    updateOrgao,
    saveListaBatch,
    setEditingListaId,
  };
}

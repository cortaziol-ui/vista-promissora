import { useEffect, useMemo, useState } from 'react';
import { Plus, Link2, Trash2, Copy, Check, Pencil, X, Calendar, Inbox, Save, Loader2 } from 'lucide-react';
import {
  useListasParceiros,
  ListaParceiros,
  ListaOrgao,
  StatusGeral,
  STATUS_GERAL_LABEL,
} from '@/hooks/useListasParceiros';
import { ListaParceirosView } from '@/components/ListaParceirosView';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const STATUS_GERAL_DOT: Record<StatusGeral, string> = {
  andamento: 'bg-sky-400',
  baixado: 'bg-emerald-400',
  reprotocolo: 'bg-amber-400',
};

const STATUS_GERAL_PILL: Record<StatusGeral, string> = {
  andamento: 'border-sky-400/40 text-sky-200 bg-sky-500/10',
  baixado: 'border-emerald-400/40 text-emerald-200 bg-emerald-500/10',
  reprotocolo: 'border-amber-400/40 text-amber-200 bg-amber-500/10',
};

type Filtro = 'todos' | StatusGeral;

const FILTROS: { value: Filtro; label: string; dotClass?: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'andamento', label: 'Em andamento', dotClass: 'bg-sky-400' },
  { value: 'baixado', label: '100% baixado', dotClass: 'bg-emerald-400' },
  { value: 'reprotocolo', label: 'Reprotocolo', dotClass: 'bg-amber-400' },
];

// Apenas o Caio (dono da Outcom) pode editar listas. Demais usuários autenticados só visualizam.
const EMAIL_EDITOR = 'caio@outcom.com';

type ListaPatch = Partial<Pick<ListaParceiros, 'titulo' | 'status_geral'>>;
type OrgaoPatch = Partial<Omit<ListaOrgao, 'id' | 'lista_id' | 'nome' | 'ordem'>>;

function formatUltima(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

export default function ListasParceirosPage() {
  const { user } = useAuth();
  const canEdit = user?.email?.toLowerCase() === EMAIL_EDITOR;
  const { listas, loading, createLista, updateLista, deleteLista, saveListaBatch, setEditingListaId } = useListasParceiros();

  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const [tituloEditando, setTituloEditando] = useState<string | null>(null);
  const [tituloDraft, setTituloDraft] = useState('');
  const [linkCopiadoId, setLinkCopiadoId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // ===== Modo edição em lote =====
  // editingId === selecionadaId quando está editando a lista atual.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftLista, setDraftLista] = useState<ListaPatch>({});
  const [draftOrgaos, setDraftOrgaos] = useState<Record<string, OrgaoPatch>>({});
  const [saving, setSaving] = useState(false);

  const filtradas = useMemo(() => {
    if (filtro === 'todos') return listas;
    return listas.filter((l) => l.status_geral === filtro);
  }, [filtro, listas]);

  useEffect(() => {
    if (filtradas.length === 0) {
      setSelecionadaId(null);
      return;
    }
    if (!selecionadaId || !filtradas.find((l) => l.id === selecionadaId)) {
      setSelecionadaId(filtradas[0].id);
    }
  }, [filtradas, selecionadaId]);

  const selecionada: ListaParceiros | null = useMemo(
    () => listas.find((l) => l.id === selecionadaId) || null,
    [listas, selecionadaId],
  );

  // Em modo edit, mescla a lista atual com o draft pra a view exibir já com mudanças pendentes
  const listaParaView: ListaParceiros | null = useMemo(() => {
    if (!selecionada) return null;
    if (editingId !== selecionada.id) return selecionada;
    return {
      ...selecionada,
      ...draftLista,
      orgaos: selecionada.orgaos.map((o) => {
        const patch = draftOrgaos[o.id];
        return patch ? { ...o, ...patch } : o;
      }),
    };
  }, [selecionada, editingId, draftLista, draftOrgaos]);

  const totalChanges = useMemo(() => {
    const listaChanges = Object.keys(draftLista).length > 0 ? 1 : 0;
    const orgaoChanges = Object.values(draftOrgaos).filter((p) => Object.keys(p).length > 0).length;
    return listaChanges + orgaoChanges;
  }, [draftLista, draftOrgaos]);

  const isEditingNow = editingId !== null && editingId === selecionadaId;

  // Sinaliza ao hook qual lista está em edição (pra realtime ignorar)
  useEffect(() => {
    setEditingListaId(editingId);
    return () => setEditingListaId(null);
  }, [editingId, setEditingListaId]);

  const confirmDescartarSeAlteracoes = (): boolean => {
    if (totalChanges === 0) return true;
    return window.confirm('Descartar alterações não salvas?');
  };

  const handleStartEdit = () => {
    if (!selecionada) return;
    setEditingId(selecionada.id);
    setDraftLista({});
    setDraftOrgaos({});
  };

  const handleCancelEdit = () => {
    if (!confirmDescartarSeAlteracoes()) return;
    setEditingId(null);
    setDraftLista({});
    setDraftOrgaos({});
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    const ok = await saveListaBatch(
      editingId,
      Object.keys(draftLista).length > 0 ? draftLista : null,
      draftOrgaos,
    );
    setSaving(false);
    if (ok) {
      toast.success(`Lista atualizada (${totalChanges} ${totalChanges === 1 ? 'alteração' : 'alterações'})`);
      setEditingId(null);
      setDraftLista({});
      setDraftOrgaos({});
    } else {
      toast.error('Erro ao salvar alterações. Tente novamente.');
    }
  };

  const handleChangeLista = (patch: ListaPatch) => {
    setDraftLista((prev) => ({ ...prev, ...patch }));
  };

  const handleChangeOrgao = (orgaoId: string, patch: Partial<ListaOrgao>) => {
    setDraftOrgaos((prev) => ({
      ...prev,
      [orgaoId]: { ...(prev[orgaoId] ?? {}), ...patch },
    }));
  };

  // Trocar de lista durante edição: confirma descarte
  const handleSelectLista = (id: string) => {
    if (isEditingNow && id !== selecionadaId) {
      if (!confirmDescartarSeAlteracoes()) return;
      setEditingId(null);
      setDraftLista({});
      setDraftOrgaos({});
    }
    setSelecionadaId(id);
  };

  const handleCreate = async () => {
    setCreating(true);
    await createLista();
    setCreating(false);
    toast.success('Nova lista da semana criada');
  };

  const handleEditTitulo = (lista: ListaParceiros) => {
    setTituloEditando(lista.id);
    setTituloDraft(lista.titulo);
  };

  const handleSalvarTitulo = async () => {
    if (!tituloEditando) return;
    const novo = tituloDraft.trim();
    if (!novo) {
      setTituloEditando(null);
      return;
    }
    const ok = await updateLista(tituloEditando, { titulo: novo });
    if (ok) toast.success('Título atualizado');
    setTituloEditando(null);
  };

  const handleCopiarLink = async (lista: ListaParceiros) => {
    const url = `${window.location.origin}/lista/${lista.slug_publico}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopiadoId(lista.id);
      toast.success('Link copiado — pode enviar para o cliente');
      setTimeout(() => setLinkCopiadoId((id) => (id === lista.id ? null : id)), 2200);
    } catch {
      toast.error('Não foi possível copiar o link');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteLista(id);
    if (ok) {
      toast.success('Lista removida');
      setConfirmDelete(null);
      if (selecionadaId === id) setSelecionadaId(null);
      if (editingId === id) {
        setEditingId(null);
        setDraftLista({});
        setDraftOrgaos({});
      }
    } else {
      toast.error('Erro ao remover lista');
    }
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Acompanhamento Processos Limpa Nome</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Acompanhe o andamento das listas semanais por órgão. Gere link compartilhável para enviar aos clientes daquela leva.
          </p>
        </div>
        {canEdit && !isEditingNow && (
          <button
            onClick={handleCreate}
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 hover-lift disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Nova lista da semana
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
        {/* COLUNA ESQUERDA */}
        <aside className="glass-card p-5 flex flex-col gap-4 lg:max-h-[calc(100vh-180px)] lg:sticky lg:top-20">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Processos da semana</h2>
              <span className="text-xs text-muted-foreground tabular-nums">{listas.length}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Cada lista representa uma leva semanal de processos coletivos.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTROS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFiltro(f.value)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  filtro === f.value
                    ? 'border-primary/60 bg-primary/15 text-primary'
                    : 'border-border/40 bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {f.dotClass && <span className={`w-1.5 h-1.5 rounded-full ${f.dotClass}`} />}
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-2.5 min-h-0">
            {loading ? (
              <div className="text-sm text-muted-foreground p-4">Carregando...</div>
            ) : filtradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-secondary/60 border border-border/40 flex items-center justify-center mb-3">
                  <Inbox className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-foreground font-medium mb-1">
                  {listas.length === 0 ? 'Nenhuma lista ainda' : 'Nenhuma lista neste filtro'}
                </p>
                <p className="text-xs text-muted-foreground max-w-[240px]">
                  {listas.length === 0
                    ? 'Clique em "Nova lista da semana" para começar a primeira leva.'
                    : 'Ajuste o filtro acima para ver outras listas.'}
                </p>
              </div>
            ) : (
              filtradas.map((lista) => {
                const isSel = lista.id === selecionadaId;
                return (
                  <div
                    key={lista.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectLista(lista.id)}
                    className={`group rounded-xl border p-3.5 cursor-pointer transition-all ${
                      isSel
                        ? 'border-primary/50 bg-primary/8 shadow-md shadow-primary/10'
                        : 'border-border/40 bg-secondary/30 hover:bg-secondary/60 hover:border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      {tituloEditando === lista.id ? (
                        <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            autoFocus
                            value={tituloDraft}
                            onChange={(e) => setTituloDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSalvarTitulo();
                              if (e.key === 'Escape') setTituloEditando(null);
                            }}
                            className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1.5 text-sm font-semibold text-foreground focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                          />
                          <button onClick={handleSalvarTitulo} className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => setTituloEditando(null)} className="p-1 rounded text-muted-foreground hover:bg-secondary">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-base font-semibold text-foreground truncate">{lista.titulo}</div>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] uppercase tracking-wider border font-semibold ${STATUS_GERAL_PILL[lista.status_geral]}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_GERAL_DOT[lista.status_geral]}`} />
                        {STATUS_GERAL_LABEL[lista.status_geral]}
                      </span>
                      <span className="text-[11px] text-muted-foreground tabular-nums flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatUltima(lista.ultima_atualizacao)}
                      </span>
                    </div>
                    {canEdit && !isEditingNow && (
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTitulo(lista);
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-[11px] rounded-md text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
                          title="Editar título"
                        >
                          <Pencil className="h-3 w-3" />
                          Editar
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopiarLink(lista);
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-[11px] rounded-md text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
                          title="Copiar link público"
                        >
                          {linkCopiadoId === lista.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Link2 className="h-3 w-3" />}
                          {linkCopiadoId === lista.id ? 'Copiado' : 'Link'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete(lista.id);
                          }}
                          className="inline-flex items-center justify-center p-1.5 rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors"
                          title="Remover lista"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-border/40 pt-3 flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> Andamento
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Baixado
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Reprotocolo
            </span>
          </div>
        </aside>

        {/* COLUNA DIREITA */}
        <section className="min-w-0">
          {selecionada && canEdit && (
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                {isEditingNow ? (
                  <span className="inline-flex items-center gap-1.5 text-foreground font-medium">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Modo edição —{' '}
                    {totalChanges === 0
                      ? 'sem alterações'
                      : totalChanges === 1
                        ? '1 alteração pendente'
                        : `${totalChanges} alterações pendentes`}
                  </span>
                ) : (
                  <span>Modo leitura · clique em "Editar lista" para fazer mudanças em lote</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isEditingNow ? (
                  <>
                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl border border-border/50 bg-secondary/40 px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving || totalChanges === 0}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Salvar alterações
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleCopiarLink(selecionada)}
                      className="inline-flex items-center gap-2 rounded-xl border border-border/50 bg-secondary/40 px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
                    >
                      {linkCopiadoId === selecionada.id ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-400" /> Link copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" /> Copiar link público
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleStartEdit}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90"
                    >
                      <Pencil className="h-4 w-4" />
                      Editar lista
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
          <ListaParceirosView
            lista={listaParaView}
            mode={isEditingNow ? 'edit' : 'view'}
            onChangeLista={handleChangeLista}
            onChangeOrgao={handleChangeOrgao}
          />
        </section>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="glass-card p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2 text-foreground">Remover esta lista?</h3>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              Esta ação remove a lista e todos os órgãos associados. O link público também deixa de funcionar.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg border border-border/60 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

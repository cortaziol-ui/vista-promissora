import { useState, useMemo, useEffect } from 'react';
import {
  ListaParceiros,
  ListaOrgao,
  StatusOrgao,
  StatusGeral,
  STATUS_GERAL_LABEL,
  STATUS_ORGAO_LABEL,
  ORGAOS_FIXOS,
  DESCRICAO_DEFAULT_POR_STATUS,
} from '@/hooks/useListasParceiros';
import { ChevronDown, Pencil, Save, X, Building2, FileText, CheckCircle2, Clock, RotateCcw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

const STATUS_ORGAO_DOT: Record<StatusOrgao, string> = {
  aguardando: 'bg-amber-400',
  iniciadas: 'bg-sky-400',
  concluidas: 'bg-emerald-400',
  protocolo: 'bg-zinc-400',
};

const STATUS_GERAL_DOT: Record<StatusGeral, string> = {
  andamento: 'bg-sky-400',
  baixado: 'bg-emerald-400',
  reprotocolo: 'bg-amber-400',
};

const STATUS_ORGAO_BADGE: Record<StatusOrgao, string> = {
  aguardando: 'bg-amber-500/15 text-amber-200 border-amber-400/40',
  iniciadas: 'bg-sky-500/15 text-sky-200 border-sky-400/40',
  concluidas: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40',
  protocolo: 'bg-zinc-500/15 text-zinc-200 border-zinc-400/40',
};

const STATUS_GERAL_BADGE: Record<StatusGeral, string> = {
  andamento: 'bg-sky-500/15 text-sky-200 border-sky-400/40',
  baixado: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40',
  reprotocolo: 'bg-amber-500/15 text-amber-200 border-amber-400/40',
};

function formatDateBR(d: string | null): string {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}

function formatLinha(rotulo: string, data: string | null, hora: string | null): { label: string; value: string } | null {
  const d = formatDateBR(data);
  const h = (hora || '').trim();
  if (!d && !h) return null;
  if (d && h) return { label: rotulo, value: `${d} às ${h}` };
  if (d) return { label: rotulo, value: d };
  return { label: rotulo, value: h };
}

function formatUltimaAtualizacao(iso: string | null | undefined): string {
  if (!iso) return 'Sem registro';
  try {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Sem registro';
  }
}

interface OrgaoCardProps {
  orgao: ListaOrgao;
  editable: boolean;
  onUpdate?: (id: string, patch: Partial<ListaOrgao>) => Promise<boolean> | void;
}

function OrgaoCard({ orgao, editable, onUpdate }: OrgaoCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ListaOrgao>(orgao);

  useEffect(() => {
    if (!editing) setDraft(orgao);
  }, [orgao, editing]);

  const linhas = [
    formatLinha('Último protocolo enviado', orgao.protocolo_data, orgao.protocolo_hora),
    formatLinha('Recepcionado', orgao.recepcionado_data, orgao.recepcionado_hora),
    formatLinha('Baixas iniciadas', orgao.iniciadas_data, orgao.iniciadas_hora),
    formatLinha('Baixas concluídas', orgao.concluidas_data, orgao.concluidas_hora),
  ].filter(Boolean) as { label: string; value: string }[];

  // Detecta se a descrição atual é o default de algum status.
  // Se for, ao mudar de status atualiza o texto pra default do novo.
  // Se não, preserva o texto manual que o admin escreveu.
  const isDefaultDesc = (desc: string | null) => {
    if (!desc) return true;
    const trimmed = desc.trim();
    return Object.values(DESCRICAO_DEFAULT_POR_STATUS).some((d) => d.trim() === trimmed);
  };

  const setStatus = async (next: StatusOrgao) => {
    if (!editable || !onUpdate) return;
    const patch: Partial<ListaOrgao> = { status: next };
    const now = new Date();
    const dateIso = now.toISOString().slice(0, 10);
    const hora = now.toTimeString().slice(0, 5);
    if (next === 'iniciadas' && !orgao.iniciadas_data) {
      patch.iniciadas_data = dateIso;
      patch.iniciadas_hora = hora;
    }
    if (next === 'concluidas' && !orgao.concluidas_data) {
      patch.concluidas_data = dateIso;
      patch.concluidas_hora = hora;
    }
    if (next === 'protocolo' && !orgao.protocolo_data) {
      patch.protocolo_data = dateIso;
      patch.protocolo_hora = hora;
    }
    // Se a descrição atual está vazia ou é um default conhecido, atualiza pro default do novo status
    if (isDefaultDesc(orgao.descricao)) {
      patch.descricao = DESCRICAO_DEFAULT_POR_STATUS[next];
    }
    await onUpdate(orgao.id, patch);
    setStatusOpen(false);
  };

  const handleSave = async () => {
    if (!onUpdate) return;
    await onUpdate(orgao.id, {
      descricao: draft.descricao,
      protocolo_data: draft.protocolo_data || null,
      protocolo_hora: draft.protocolo_hora || null,
      recepcionado_data: draft.recepcionado_data || null,
      recepcionado_hora: draft.recepcionado_hora || null,
      iniciadas_data: draft.iniciadas_data || null,
      iniciadas_hora: draft.iniciadas_hora || null,
      concluidas_data: draft.concluidas_data || null,
      concluidas_hora: draft.concluidas_hora || null,
    });
    setEditing(false);
  };

  return (
    <div className="glass-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground tracking-tight truncate">{orgao.nome}</h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {editable && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Editar dados deste órgão"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {editable ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold border outline-none focus:ring-2 focus:ring-primary/40 ${STATUS_ORGAO_BADGE[orgao.status]} cursor-pointer hover:opacity-90`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_ORGAO_DOT[orgao.status]}`} />
                <span className="whitespace-nowrap">{STATUS_ORGAO_LABEL[orgao.status]}</span>
                <ChevronDown className="h-3 w-3 opacity-70" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-1.5">
                {(Object.keys(STATUS_ORGAO_LABEL) as StatusOrgao[]).map((st) => (
                  <DropdownMenuItem
                    key={st}
                    onSelect={() => setStatus(st)}
                    className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg cursor-pointer ${st === orgao.status ? 'bg-secondary font-semibold' : ''}`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_ORGAO_DOT[st]}`} />
                    {STATUS_ORGAO_LABEL[st]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold border ${STATUS_ORGAO_BADGE[orgao.status]}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_ORGAO_DOT[orgao.status]}`} />
              <span className="whitespace-nowrap">{STATUS_ORGAO_LABEL[orgao.status]}</span>
            </div>
          )}
        </div>
      </div>

      {editing ? (
        <div className="flex flex-col gap-4 pt-2 border-t border-border/40">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Descrição</label>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, descricao: DESCRICAO_DEFAULT_POR_STATUS[orgao.status] })}
                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-primary hover:opacity-80"
                title={`Usar texto padrão para "${STATUS_ORGAO_LABEL[orgao.status]}"`}
              >
                <RotateCcw className="h-3 w-3" />
                Usar texto padrão
              </button>
            </div>
            <textarea
              className="w-full rounded-lg bg-background/60 border border-border/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 resize-y min-h-[96px]"
              value={draft.descricao || ''}
              onChange={(e) => setDraft({ ...draft, descricao: e.target.value })}
              placeholder={DESCRICAO_DEFAULT_POR_STATUS[orgao.status]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DataHoraField
              label="Último protocolo"
              data={draft.protocolo_data}
              hora={draft.protocolo_hora}
              onData={(v) => setDraft({ ...draft, protocolo_data: v })}
              onHora={(v) => setDraft({ ...draft, protocolo_hora: v })}
            />
            <DataHoraField
              label="Recepcionado"
              data={draft.recepcionado_data}
              hora={draft.recepcionado_hora}
              onData={(v) => setDraft({ ...draft, recepcionado_data: v })}
              onHora={(v) => setDraft({ ...draft, recepcionado_hora: v })}
            />
            <DataHoraField
              label="Baixas iniciadas"
              data={draft.iniciadas_data}
              hora={draft.iniciadas_hora}
              onData={(v) => setDraft({ ...draft, iniciadas_data: v })}
              onHora={(v) => setDraft({ ...draft, iniciadas_hora: v })}
            />
            <DataHoraField
              label="Baixas concluídas"
              data={draft.concluidas_data}
              hora={draft.concluidas_hora}
              onData={(v) => setDraft({ ...draft, concluidas_data: v })}
              onHora={(v) => setDraft({ ...draft, concluidas_hora: v })}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setEditing(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Save className="h-3.5 w-3.5" />
              Salvar
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
            {orgao.descricao?.trim() || DESCRICAO_DEFAULT_POR_STATUS[orgao.status]}
          </p>
          {linhas.length > 0 && (
            <div className="flex flex-col gap-1.5 pt-3 border-t border-border/40">
              {linhas.map((l, i) => (
                <div key={i} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{l.label}</span>
                  <span className="font-medium text-foreground tabular-nums">{l.value}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DataHoraField(props: {
  label: string;
  data: string | null;
  hora: string | null;
  onData: (v: string | null) => void;
  onHora: (v: string | null) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
        {props.label}
      </label>
      <div className="flex gap-1.5">
        <input
          type="date"
          className="flex-1 rounded-lg bg-background/60 border border-border/60 px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          value={props.data || ''}
          onChange={(e) => props.onData(e.target.value || null)}
        />
        <input
          type="time"
          className="w-[90px] rounded-lg bg-background/60 border border-border/60 px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          value={props.hora || ''}
          onChange={(e) => props.onHora(e.target.value || null)}
        />
      </div>
    </div>
  );
}

interface ListaParceirosViewProps {
  lista: ListaParceiros | null;
  editable: boolean;
  onUpdateOrgao?: (id: string, patch: Partial<ListaOrgao>) => Promise<boolean> | void;
  onChangeStatusGeral?: (next: StatusGeral) => void;
  onEditTitulo?: () => void;
  emptyState?: React.ReactNode;
}

export function ListaParceirosView({
  lista,
  editable,
  onUpdateOrgao,
  onChangeStatusGeral,
  onEditTitulo,
  emptyState,
}: ListaParceirosViewProps) {

  const orgaos = useMemo(() => {
    if (!lista) return [];
    const byNome = new Map(lista.orgaos.map((o) => [o.nome, o]));
    const ordenados: ListaOrgao[] = [];
    ORGAOS_FIXOS.forEach((nome) => {
      const o = byNome.get(nome);
      if (o) {
        ordenados.push(o);
        byNome.delete(nome);
      }
    });
    Array.from(byNome.values())
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .forEach((o) => ordenados.push(o));
    return ordenados;
  }, [lista]);

  if (!lista) {
    return (
      <div className="glass-card flex-1 flex items-center justify-center min-h-[420px] p-10 text-center">
        {emptyState ?? (
          <div className="max-w-sm space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-foreground">Selecione uma lista</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Escolha uma lista da semana à esquerda para consultar o status geral e a situação em cada órgão.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Card resumo */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">{lista.titulo}</h2>
              {editable && onEditTitulo && (
                <button
                  onClick={onEditTitulo}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  title="Editar título"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Resumo do processo coletivo desta lista e situação em cada órgão.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Última atualização</div>
            <div className="text-sm font-semibold text-foreground tabular-nums mt-0.5">{formatUltimaAtualizacao(lista.ultima_atualizacao)}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {editable ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border outline-none focus:ring-2 focus:ring-primary/40 ${STATUS_GERAL_BADGE[lista.status_geral]} cursor-pointer hover:opacity-90`}
              >
                <span className={`w-2 h-2 rounded-full ${STATUS_GERAL_DOT[lista.status_geral]}`} />
                <span>{STATUS_GERAL_LABEL[lista.status_geral]}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 p-1.5">
                {(Object.keys(STATUS_GERAL_LABEL) as StatusGeral[]).map((st) => (
                  <DropdownMenuItem
                    key={st}
                    onSelect={() => onChangeStatusGeral?.(st)}
                    className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg cursor-pointer ${st === lista.status_geral ? 'bg-secondary font-semibold' : ''}`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_GERAL_DOT[st]}`} />
                    {STATUS_GERAL_LABEL[st]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border ${STATUS_GERAL_BADGE[lista.status_geral]}`}
            >
              <span className={`w-2 h-2 rounded-full ${STATUS_GERAL_DOT[lista.status_geral]}`} />
              <span>{STATUS_GERAL_LABEL[lista.status_geral]}</span>
            </div>
          )}
          <div className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium border border-border/40 bg-secondary/50 text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            Processo coletivo Out.com · {lista.titulo}
          </div>
        </div>
      </div>

      {/* Card órgãos */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1 flex-wrap">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Situação por órgão</h3>
          <span className="text-xs text-muted-foreground hidden md:inline">
            · {ORGAOS_FIXOS.join(' · ')}
          </span>
        </div>

        {orgaos.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-sm text-muted-foreground italic">
              Esta lista ainda não possui detalhamento cadastrado por órgão.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orgaos.map((o) => (
              <OrgaoCard key={o.id} orgao={o} editable={editable} onUpdate={onUpdateOrgao} />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground/70 px-1">
        <Clock className="h-3 w-3" />
        Atualizado em tempo real pela equipe Out.com
      </div>
    </div>
  );
}

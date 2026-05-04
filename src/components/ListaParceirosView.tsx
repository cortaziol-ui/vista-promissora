import { useMemo } from 'react';
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
import { Building2, FileText, CheckCircle2, Clock } from 'lucide-react';
import { OrgaoEditCard } from '@/components/OrgaoEditCard';

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

function formatUltimaAtualizacao(iso: string | null | undefined): string {
  if (!iso) return 'Sem registro';
  try {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Sem registro';
  }
}

function OrgaoViewCard({ orgao }: { orgao: ListaOrgao }) {
  const descricao = orgao.descricao?.trim() || DESCRICAO_DEFAULT_POR_STATUS[orgao.status];

  return (
    <div className="glass-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground tracking-tight truncate">{orgao.nome}</h3>
        </div>
        <div
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold border ${STATUS_ORGAO_BADGE[orgao.status]}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_ORGAO_DOT[orgao.status]}`} />
          <span className="whitespace-nowrap">{STATUS_ORGAO_LABEL[orgao.status]}</span>
        </div>
      </div>

      <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{descricao}</p>
    </div>
  );
}

interface ListaParceirosViewProps {
  /** Lista atual (já com draft mesclado se mode==='edit') */
  lista: ListaParceiros | null;
  /** 'view' = display puro, 'edit' = inputs/selects controlados */
  mode: 'view' | 'edit';
  /** Em modo edit: callback de mudança no header (titulo / status_geral) */
  onChangeLista?: (patch: Partial<Pick<ListaParceiros, 'titulo' | 'status_geral'>>) => void;
  /** Em modo edit: callback de mudança em um órgão específico */
  onChangeOrgao?: (orgaoId: string, patch: Partial<ListaOrgao>) => void;
  emptyState?: React.ReactNode;
}

export function ListaParceirosView({
  lista,
  mode,
  onChangeLista,
  onChangeOrgao,
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

  const isEditing = mode === 'edit';

  return (
    <div className="flex flex-col gap-5">
      {/* Card resumo */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <input
                type="text"
                value={lista.titulo}
                onChange={(e) => onChangeLista?.({ titulo: e.target.value })}
                className="w-full text-2xl font-bold text-foreground tracking-tight bg-background/60 border border-border/60 rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                placeholder="Título da lista"
              />
            ) : (
              <h2 className="text-2xl font-bold text-foreground tracking-tight">{lista.titulo}</h2>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              Resumo do processo coletivo desta lista e situação em cada órgão.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Última atualização</div>
            <div className="text-sm font-semibold text-foreground tabular-nums mt-0.5">{formatUltimaAtualizacao(lista.ultima_atualizacao)}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {isEditing ? (
            <div className="relative inline-flex items-center">
              <span className={`absolute left-3 w-2 h-2 rounded-full ${STATUS_GERAL_DOT[lista.status_geral]} pointer-events-none`} />
              <select
                value={lista.status_geral}
                onChange={(e) => onChangeLista?.({ status_geral: e.target.value as StatusGeral })}
                className="appearance-none rounded-lg bg-background/60 border border-border/60 pl-7 pr-9 py-2 text-sm font-semibold text-foreground focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                {(Object.keys(STATUS_GERAL_LABEL) as StatusGeral[]).map((st) => (
                  <option key={st} value={st} className="bg-popover">
                    {STATUS_GERAL_LABEL[st]}
                  </option>
                ))}
              </select>
              <svg className="absolute right-3 w-3.5 h-3.5 text-muted-foreground pointer-events-none" viewBox="0 0 12 12" fill="none">
                <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
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
            {orgaos.map((o) =>
              isEditing ? (
                <OrgaoEditCard
                  key={o.id}
                  value={o}
                  onChange={(patch) => onChangeOrgao?.(o.id, patch)}
                />
              ) : (
                <OrgaoViewCard key={o.id} orgao={o} />
              ),
            )}
          </div>
        )}
      </div>

      {!isEditing && (
        <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground/70 px-1">
          <Clock className="h-3 w-3" />
          Atualizado em tempo real pela equipe Out.com
        </div>
      )}
    </div>
  );
}

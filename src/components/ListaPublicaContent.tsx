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

const NAVY = '#0a3d6b';

const STATUS_GERAL_PILL: Record<StatusGeral, { bg: string; color: string; border: string; dot: string }> = {
  andamento: { bg: '#e0f2fe', color: '#075985', border: '#7dd3fc', dot: '#0ea5e9' },
  baixado: { bg: '#dcfce7', color: '#166534', border: '#86efac', dot: '#22c55e' },
  reprotocolo: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d', dot: '#f59e0b' },
};

const STATUS_ORGAO_PILL: Record<StatusOrgao, { bg: string; color: string; border: string; dot: string }> = {
  aguardando: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d', dot: '#f59e0b' },
  iniciadas: { bg: '#e0f2fe', color: '#075985', border: '#7dd3fc', dot: '#0ea5e9' },
  concluidas: { bg: '#dcfce7', color: '#166534', border: '#86efac', dot: '#22c55e' },
  protocolo: { bg: '#f1f5f9', color: '#334155', border: '#cbd5e1', dot: '#64748b' },
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

function StatusPill({ pill, label }: { pill: { bg: string; color: string; border: string; dot: string }; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider border"
      style={{ background: pill.bg, color: pill.color, borderColor: pill.border }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: pill.dot }} />
      {label}
    </span>
  );
}

function OrgaoCard({ orgao }: { orgao: ListaOrgao }) {
  const pill = STATUS_ORGAO_PILL[orgao.status];
  const descricao = orgao.descricao?.trim() || DESCRICAO_DEFAULT_POR_STATUS[orgao.status];

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: '#fafafa', border: '1px solid #e5e7eb' }}>
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-bold tracking-tight" style={{ color: NAVY }}>
          {orgao.nome}
        </h4>
        <StatusPill pill={pill} label={STATUS_ORGAO_LABEL[orgao.status]} />
      </div>

      <p className="text-[13px] leading-relaxed whitespace-pre-line" style={{ color: '#374151' }}>
        {descricao}
      </p>
    </div>
  );
}

interface ListaPublicaContentProps {
  lista: ListaParceiros;
}

export function ListaPublicaContent({ lista }: ListaPublicaContentProps) {
  const orgaos = useMemo(() => {
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

  const pillGeral = STATUS_GERAL_PILL[lista.status_geral];

  return (
    <div className="space-y-3">
      {/* Card Resumo */}
      <div className="rounded-xl shadow-sm overflow-hidden" style={{ background: '#fff', borderTop: `4px solid ${NAVY}` }}>
        <div className="px-6 py-5">
          <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="text-xl font-semibold" style={{ color: NAVY }}>
                {lista.titulo}
              </h2>
              <p className="text-[13px] mt-0.5" style={{ color: '#6b7280' }}>
                Resumo do processo coletivo desta lista
              </p>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#9ca3af' }}>
                Última atualização
              </div>
              <div className="text-[13px] font-semibold tabular-nums" style={{ color: '#111827' }}>
                {formatUltimaAtualizacao(lista.ultima_atualizacao)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusPill pill={pillGeral} label={STATUS_GERAL_LABEL[lista.status_geral]} />
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] uppercase tracking-wider border"
              style={{ background: '#f9fafb', color: '#6b7280', borderColor: '#e5e7eb' }}
            >
              Processo coletivo Out.com
            </span>
          </div>
        </div>
      </div>

      {/* Card Órgãos */}
      <div className="rounded-xl shadow-sm overflow-hidden" style={{ background: '#fff', borderTop: `4px solid ${NAVY}` }}>
        <div className="px-6 py-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold" style={{ color: NAVY }}>
              Situação por órgão
            </h3>
            <p className="text-[12px] mt-0.5" style={{ color: '#9ca3af' }}>
              {ORGAOS_FIXOS.join(' · ')}
            </p>
          </div>
          {orgaos.length === 0 ? (
            <p className="text-[13px] italic py-4 text-center" style={{ color: '#6b7280' }}>
              Esta lista ainda não possui detalhamento cadastrado por órgão.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {orgaos.map((o) => (
                <OrgaoCard key={o.id} orgao={o} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

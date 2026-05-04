import { RotateCcw } from 'lucide-react';
import {
  ListaOrgao,
  StatusOrgao,
  STATUS_ORGAO_LABEL,
  DESCRICAO_DEFAULT_POR_STATUS,
} from '@/hooks/useListasParceiros';

const STATUS_DOT: Record<StatusOrgao, string> = {
  aguardando: 'bg-amber-400',
  iniciadas: 'bg-sky-400',
  concluidas: 'bg-emerald-400',
  protocolo: 'bg-zinc-400',
};

interface OrgaoEditCardProps {
  /** Estado atual do órgão (já mesclado com o draft) */
  value: ListaOrgao;
  /** Callback de mudança — patch parcial */
  onChange: (patch: Partial<ListaOrgao>) => void;
}

export function OrgaoEditCard({ value, onChange }: OrgaoEditCardProps) {
  const isDefaultDesc = (desc: string | null) => {
    if (!desc) return true;
    const trimmed = desc.trim();
    return Object.values(DESCRICAO_DEFAULT_POR_STATUS).some((d) => d.trim() === trimmed);
  };

  const handleStatusChange = (next: StatusOrgao) => {
    const patch: Partial<ListaOrgao> = { status: next };
    // Auto-preenche datas se for primeira vez naquele estágio
    const now = new Date();
    const dateIso = now.toISOString().slice(0, 10);
    const hora = now.toTimeString().slice(0, 5);
    if (next === 'iniciadas' && !value.iniciadas_data) {
      patch.iniciadas_data = dateIso;
      patch.iniciadas_hora = hora;
    }
    if (next === 'concluidas' && !value.concluidas_data) {
      patch.concluidas_data = dateIso;
      patch.concluidas_hora = hora;
    }
    if (next === 'protocolo' && !value.protocolo_data) {
      patch.protocolo_data = dateIso;
      patch.protocolo_hora = hora;
    }
    // Se descrição era default ou vazia, troca pro default do novo status
    if (isDefaultDesc(value.descricao)) {
      patch.descricao = DESCRICAO_DEFAULT_POR_STATUS[next];
    }
    onChange(patch);
  };

  return (
    <div className="glass-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-foreground tracking-tight">{value.nome}</h3>
        <div className="relative inline-flex items-center">
          <span className={`absolute left-2.5 w-1.5 h-1.5 rounded-full ${STATUS_DOT[value.status]} pointer-events-none`} />
          <select
            value={value.status}
            onChange={(e) => handleStatusChange(e.target.value as StatusOrgao)}
            className="appearance-none rounded-lg bg-background/60 border border-border/60 pl-6 pr-7 py-1.5 text-[12px] font-semibold text-foreground focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            {(Object.keys(STATUS_ORGAO_LABEL) as StatusOrgao[]).map((st) => (
              <option key={st} value={st} className="bg-popover text-foreground">
                {STATUS_ORGAO_LABEL[st]}
              </option>
            ))}
          </select>
          <svg className="absolute right-2 w-3 h-3 text-muted-foreground pointer-events-none" viewBox="0 0 12 12" fill="none">
            <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Descrição</label>
          <button
            type="button"
            onClick={() => onChange({ descricao: DESCRICAO_DEFAULT_POR_STATUS[value.status] })}
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-primary hover:opacity-80"
            title={`Usar texto padrão para "${STATUS_ORGAO_LABEL[value.status]}"`}
          >
            <RotateCcw className="h-3 w-3" />
            Usar texto padrão
          </button>
        </div>
        <textarea
          className="w-full rounded-lg bg-background/60 border border-border/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 resize-y min-h-[80px]"
          value={value.descricao || ''}
          onChange={(e) => onChange({ descricao: e.target.value })}
          placeholder={DESCRICAO_DEFAULT_POR_STATUS[value.status]}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DataHoraField
          label="Último protocolo"
          data={value.protocolo_data}
          hora={value.protocolo_hora}
          onChange={(data, hora) => onChange({ protocolo_data: data, protocolo_hora: hora })}
        />
        <DataHoraField
          label="Recepcionado"
          data={value.recepcionado_data}
          hora={value.recepcionado_hora}
          onChange={(data, hora) => onChange({ recepcionado_data: data, recepcionado_hora: hora })}
        />
        <DataHoraField
          label="Baixas iniciadas"
          data={value.iniciadas_data}
          hora={value.iniciadas_hora}
          onChange={(data, hora) => onChange({ iniciadas_data: data, iniciadas_hora: hora })}
        />
        <DataHoraField
          label="Baixas concluídas"
          data={value.concluidas_data}
          hora={value.concluidas_hora}
          onChange={(data, hora) => onChange({ concluidas_data: data, concluidas_hora: hora })}
        />
      </div>
    </div>
  );
}

function DataHoraField(props: {
  label: string;
  data: string | null;
  hora: string | null;
  onChange: (data: string | null, hora: string | null) => void;
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
          onChange={(e) => props.onChange(e.target.value || null, props.hora)}
        />
        <input
          type="time"
          className="w-[90px] rounded-lg bg-background/60 border border-border/60 px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          value={props.hora || ''}
          onChange={(e) => props.onChange(props.data, e.target.value || null)}
        />
      </div>
    </div>
  );
}

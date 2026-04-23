import { useMemo } from 'react';
import { Cliente } from '@/contexts/SalesDataContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, Check, Pencil } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const FASES = [
  { n: 1, titulo: 'Boas-vindas', gatilho: '+1 dia' },
  { n: 2, titulo: 'Acompanhamento', gatilho: '+15 dias' },
  { n: 3, titulo: 'Entrega do serviço', gatilho: 'Manual' },
  { n: 4, titulo: 'Pós-pagamento', gatilho: 'Manual' },
  { n: 5, titulo: 'Upsell', gatilho: '+15 dias após entrega' },
  { n: 6, titulo: 'Cobrança 2ª parcela', gatilho: '+30 dias após entrega' },
];

// Parse DD/MM/YYYY → Date
function parseBR(d: string): Date | null {
  if (!d) return null;
  const parts = d.split('/');
  if (parts.length !== 3) return null;
  const dt = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  return isNaN(dt.getTime()) ? null : dt;
}

/**
 * Determines which column a cliente is currently in.
 *
 * Rule: contact N goes to column N+1 only when:
 *   1. contact N status is 'feito' (concluded); AND
 *   2. contact N+1's data (data prevista) is today or past (reached its trigger time).
 *
 * Otherwise the card stays in the current column (or the lowest one pending).
 *
 * Admin can override via drag-and-drop (stored in contatos[0].obs __coluna_override__).
 */
export function getColumnOfCliente(cliente: Cliente): number {
  // Manual override: read from first contato's metadata
  const override = cliente.contatos?.[0]?.obs?.match(/__col__=(\d)/)?.[1];
  if (override) return Number(override);

  const contatos = cliente.contatos;
  if (!contatos || contatos.length === 0) return 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find the highest completed contact N where contact N+1's data has arrived
  let currentCol = 1;
  for (let i = 0; i < contatos.length; i++) {
    const c = contatos[i];
    if (c.status !== 'feito') {
      // First non-completed contact is the current column (unless blocked by date)
      currentCol = c.n;
      break;
    }
    // Contact is done. Check next one's trigger
    const next = contatos[i + 1];
    if (!next) {
      // All done — card stays in last column as "done"
      currentCol = c.n;
      break;
    }
    const nextDate = parseBR(next.data);
    if (!nextDate || nextDate.getTime() > today.getTime()) {
      // Next hasn't triggered yet — stay in current N
      currentCol = c.n;
      break;
    }
    // Next has triggered — advance
    currentCol = next.n;
  }
  return currentCol;
}

interface KanbanProps {
  clientes: Cliente[];
  onEditCliente: (c: Cliente) => void;
  onMoveCliente: (clienteId: number, newCol: number) => void;
  onMarkContatoFeito: (cliente: Cliente, contatoN: number) => void;
}

function buildWhatsappLink(telefone: string, nome: string, contatoN: number): string {
  // Normalize phone
  const digits = telefone.replace(/\D/g, '');
  const phone = digits.startsWith('55') ? digits : digits.length >= 10 ? '55' + digits : digits;

  // Suggested message by phase (Caio pode editar nas configs do WPP dele, mas deixamos um template útil)
  const messages: Record<number, string> = {
    1: `Olá ${nome.split(' ')[0]}! Seja muito bem-vindo(a) à Outcom. Começamos seu processo e vou te manter informado em cada etapa. Qualquer dúvida, estou à disposição!`,
    2: `Olá ${nome.split(' ')[0]}, passando pra te atualizar sobre o andamento do seu processo. Está tudo rodando bem. Qualquer dúvida me avise!`,
    3: `Olá ${nome.split(' ')[0]}! Seu serviço foi finalizado. Você tem 48h para efetuar o pagamento restante e já te envio o PDF com orientações de boas ações.`,
    4: `Olá ${nome.split(' ')[0]}! Pagamento confirmado. Segue o PDF com as próximas orientações. Vamos programar a data da 2ª parcela.`,
    5: `Olá ${nome.split(' ')[0]}! Agora que seu processo está pronto, temos oportunidades financeiras especiais pra você. Posso agendar um papo rápido com nosso especialista?`,
    6: `Olá ${nome.split(' ')[0]}! Passando só pra te lembrar do vencimento da 2ª parcela. Qualquer coisa me fala!`,
  };
  const msg = encodeURIComponent(messages[contatoN] || `Olá ${nome.split(' ')[0]}!`);
  return `https://wa.me/${phone}?text=${msg}`;
}

/* ─── Card component ─── */
function ClienteCard({
  cliente,
  onEdit,
  onMarkFeito,
  column,
}: {
  cliente: Cliente;
  onEdit: () => void;
  onMarkFeito: () => void;
  column: number;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(cliente.id),
    data: { cliente, column },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 50 : 'auto',
    position: isDragging ? 'relative' : undefined,
  };

  const contatoAtual = cliente.contatos?.find(c => c.n === column);
  const dataAtual = contatoAtual?.data;
  const parsedDate = parseBR(dataAtual || '');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let dateLabel = '';
  let dateColor = 'text-muted-foreground';
  if (parsedDate) {
    const diffMs = parsedDate.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      dateLabel = `⚠ Atrasado ${Math.abs(diffDays)}d`;
      dateColor = 'text-red-400';
    } else if (diffDays === 0) {
      dateLabel = '🔥 Hoje';
      dateColor = 'text-amber-400';
    } else if (diffDays <= 3) {
      dateLabel = `⏰ Em ${diffDays}d`;
      dateColor = 'text-yellow-400';
    } else {
      dateLabel = `📅 ${dataAtual}`;
      dateColor = 'text-muted-foreground';
    }
  }

  const feitos = cliente.contatos?.filter(c => c.status === 'feito').length || 0;

  const firstName = cliente.nome.split(' ')[0] || cliente.nome;
  const wppUrl = cliente.telefone ? buildWhatsappLink(cliente.telefone, cliente.nome, column) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg bg-card border ${isDragging ? 'border-primary shadow-2xl' : 'border-border/50'} p-3 cursor-grab active:cursor-grabbing hover:border-primary/50 hover:bg-card/80 transition-colors`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-foreground leading-tight" title={cliente.nome}>
          {firstName} {cliente.nome.split(' ').slice(1, 2).join(' ')}
        </p>
        <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">
          {feitos}/6
        </Badge>
      </div>

      <p className="text-[10px] text-muted-foreground mb-2 truncate" title={cliente.vendedor}>
        👤 {cliente.vendedor}
      </p>

      {dateLabel && (
        <p className={`text-[10px] ${dateColor} mb-2 font-medium`}>{dateLabel}</p>
      )}

      <div className="flex items-center gap-1 mt-2" onMouseDown={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 hover:bg-emerald-500/20 hover:text-emerald-400"
          onClick={(e) => { e.stopPropagation(); onMarkFeito(); }}
          title="Marcar como feito"
          disabled={contatoAtual?.status === 'feito'}
        >
          <Check className="w-3.5 h-3.5" />
        </Button>
        {wppUrl && (
          <a
            href={wppUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-green-500/20 hover:text-green-400 transition-colors"
            title="Abrir WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </a>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 hover:bg-blue-500/20 hover:text-blue-400 ml-auto"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          title="Editar cliente"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ─── Column component ─── */
function Coluna({
  fase,
  clientes,
  onEditCliente,
  onMarkFeito,
}: {
  fase: { n: number; titulo: string; gatilho: string };
  clientes: Cliente[];
  onEditCliente: (c: Cliente) => void;
  onMarkFeito: (c: Cliente, n: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${fase.n}` });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[240px] max-w-[280px] rounded-lg bg-secondary/30 border ${isOver ? 'border-primary/70 bg-primary/5' : 'border-border/30'} flex flex-col transition-colors`}
    >
      <div className="p-3 border-b border-border/30 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
              {fase.n}
            </span>
            <p className="text-sm font-semibold text-foreground truncate" title={fase.titulo}>{fase.titulo}</p>
          </div>
          <Badge variant="secondary" className="text-xs shrink-0">{clientes.length}</Badge>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Gatilho: {fase.gatilho}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px]">
        {clientes.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground/50">
            Sem clientes
          </div>
        ) : (
          clientes.map(c => (
            <ClienteCard
              key={c.id}
              cliente={c}
              column={fase.n}
              onEdit={() => onEditCliente(c)}
              onMarkFeito={() => onMarkFeito(c, fase.n)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Main Kanban ─── */
export default function KanbanPosVenda({ clientes, onEditCliente, onMoveCliente, onMarkContatoFeito }: KanbanProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Group clientes by column
  const columns = useMemo(() => {
    const grouped: Record<number, Cliente[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (const c of clientes) {
      const col = getColumnOfCliente(c);
      if (grouped[col]) grouped[col].push(c);
    }
    return grouped;
  }, [clientes]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const overId = String(over.id);
    if (!overId.startsWith('col-')) return;
    const newCol = Number(overId.replace('col-', ''));
    const clienteId = Number(active.id);
    const fromCol = active.data.current?.column;
    if (newCol !== fromCol) {
      onMoveCliente(clienteId, newCol);
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-3">
        {FASES.map(fase => (
          <Coluna
            key={fase.n}
            fase={fase}
            clientes={columns[fase.n] || []}
            onEditCliente={onEditCliente}
            onMarkFeito={onMarkContatoFeito}
          />
        ))}
      </div>
    </DndContext>
  );
}

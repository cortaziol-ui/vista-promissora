import { useMemo, useState, useEffect, useCallback } from 'react';
import { Cliente } from '@/contexts/SalesDataContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, Check, Pencil, MessageSquareText } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

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

/**
 * Mensagens default (exibidas enquanto não tiver nada salvo no banco).
 * O admin pode editar via botão na coluna do kanban.
 * Placeholders: {{primeiro_nome}}, {{nome_completo}}, {{vendedor}}
 */
const MENSAGENS_DEFAULT: Record<number, string> = {
  1: 'Olá {{primeiro_nome}}! [edite esta mensagem]',
  2: 'Olá {{primeiro_nome}}! [edite esta mensagem]',
  3: 'Olá {{primeiro_nome}}! [edite esta mensagem]',
  4: 'Olá {{primeiro_nome}}! [edite esta mensagem]',
  5: 'Olá {{primeiro_nome}}! [edite esta mensagem]',
  6: 'Olá {{primeiro_nome}}! [edite esta mensagem]',
};

// "JOÃO DA SILVA" → "João da Silva"  (preposições/artigos minúsculos)
const LOWER_WORDS = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
function toTitleCase(name: string): string {
  if (!name) return '';
  return name
    .toLocaleLowerCase('pt-BR')
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => {
      if (i > 0 && LOWER_WORDS.has(w)) return w;
      return w.charAt(0).toLocaleUpperCase('pt-BR') + w.slice(1);
    })
    .join(' ');
}

function renderMessage(template: string, cliente: Cliente): string {
  const nomeCompleto = toTitleCase(cliente.nome);
  const primeiroNome = nomeCompleto.split(' ')[0] || nomeCompleto;
  return template
    .replace(/\{\{primeiro_nome\}\}/g, primeiroNome)
    .replace(/\{\{nome_completo\}\}/g, nomeCompleto)
    .replace(/\{\{vendedor\}\}/g, cliente.vendedor || '');
}

function buildWhatsappLink(cliente: Cliente, contatoN: number, templates: Record<number, string>): string {
  const digits = (cliente.telefone || '').replace(/\D/g, '');
  const phone = digits.startsWith('55') ? digits : digits.length >= 10 ? '55' + digits : digits;
  const template = templates[contatoN] || MENSAGENS_DEFAULT[contatoN] || '';
  const rendered = renderMessage(template, cliente);
  const msg = encodeURIComponent(rendered);
  return `https://wa.me/${phone}?text=${msg}`;
}

/* ─── Card component ─── */
function ClienteCard({
  cliente,
  onEdit,
  onMarkFeito,
  column,
  templates,
}: {
  cliente: Cliente;
  onEdit: () => void;
  onMarkFeito: () => void;
  column: number;
  templates: Record<number, string>;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(cliente.id),
    data: { cliente, column },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 9999 : undefined,
    position: isDragging ? 'relative' : undefined,
    boxShadow: isDragging ? '0 20px 40px -10px rgba(0,0,0,0.6)' : undefined,
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

  const nomeFormatado = toTitleCase(cliente.nome);
  const vendedorFormatado = toTitleCase(cliente.vendedor || '');
  // Display first + second name in Title Case
  const nomeExibido = nomeFormatado.split(' ').slice(0, 2).join(' ');
  const wppUrl = cliente.telefone ? buildWhatsappLink(cliente, column, templates) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg bg-card border ${isDragging ? 'border-primary shadow-2xl' : 'border-border/50'} p-3 cursor-grab active:cursor-grabbing hover:border-primary/50 hover:bg-card/80 transition-colors`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-foreground leading-tight" title={nomeFormatado}>
          {nomeExibido}
        </p>
        <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">
          {feitos}/6
        </Badge>
      </div>

      <p className="text-[10px] text-muted-foreground mb-2 truncate" title={vendedorFormatado}>
        👤 {vendedorFormatado}
      </p>

      {dateLabel && (
        <p className={`text-[10px] ${dateColor} mb-2 font-medium`}>{dateLabel}</p>
      )}

      <div className="flex items-center gap-1 mt-2" onMouseDown={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
        <Button
          size="sm"
          variant="ghost"
          className={
            contatoAtual?.status === 'feito'
              ? 'h-7 w-7 p-0 bg-emerald-500/20 text-emerald-400 hover:bg-amber-500/20 hover:text-amber-400'
              : 'h-7 w-7 p-0 hover:bg-emerald-500/20 hover:text-emerald-400'
          }
          onClick={(e) => { e.stopPropagation(); onMarkFeito(); }}
          title={contatoAtual?.status === 'feito' ? 'Clique para desmarcar (voltar a pendente)' : 'Marcar como feito'}
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
  onEditTemplate,
  templates,
}: {
  fase: { n: number; titulo: string; gatilho: string };
  clientes: Cliente[];
  onEditCliente: (c: Cliente) => void;
  onMarkFeito: (c: Cliente, n: number) => void;
  onEditTemplate: (n: number) => void;
  templates: Record<number, string>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${fase.n}` });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[240px] max-w-[280px] rounded-lg bg-secondary/30 border ${isOver ? 'border-primary/70 bg-primary/5' : 'border-border/30'} flex flex-col transition-colors`}
    >
      <div className="p-3 border-b border-border/30 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
              {fase.n}
            </span>
            <p className="text-sm font-semibold text-foreground truncate" title={fase.titulo}>{fase.titulo}</p>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 shrink-0 hover:bg-primary/20 hover:text-primary"
              onClick={() => onEditTemplate(fase.n)}
              title="Editar mensagem padrão do WhatsApp"
            >
              <MessageSquareText className="w-3.5 h-3.5" />
            </Button>
          </div>
          <Badge variant="secondary" className="text-xs shrink-0">{clientes.length}</Badge>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Gatilho: {fase.gatilho}</p>
      </div>
      <div className="flex-1 p-2 space-y-2 min-h-[200px]">
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
              templates={templates}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Main Kanban ─── */
export default function KanbanPosVenda({ clientes, onEditCliente, onMoveCliente, onMarkContatoFeito }: KanbanProps) {
  const { activeAccountId } = useTenant();
  const [templates, setTemplates] = useState<Record<number, string>>(MENSAGENS_DEFAULT);
  const [editingPhaseN, setEditingPhaseN] = useState<number | null>(null);
  const [draftMessage, setDraftMessage] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Load saved templates from Supabase app_settings (key: kanban_msg_1 .. kanban_msg_6)
  useEffect(() => {
    if (!activeAccountId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .eq('account_id', activeAccountId)
        .like('key', 'kanban_msg_%');
      if (cancelled || !data) return;
      const loaded: Record<number, string> = { ...MENSAGENS_DEFAULT };
      for (const row of data) {
        const m = String(row.key).match(/^kanban_msg_(\d)$/);
        if (m) loaded[Number(m[1])] = String(row.value ?? '');
      }
      setTemplates(loaded);
    })();
    return () => { cancelled = true; };
  }, [activeAccountId]);

  const openEditTemplate = (n: number) => {
    setEditingPhaseN(n);
    setDraftMessage(templates[n] ?? MENSAGENS_DEFAULT[n] ?? '');
  };

  const saveTemplate = useCallback(async () => {
    if (editingPhaseN == null || !activeAccountId) return;
    const n = editingPhaseN;
    const value = draftMessage;
    const { error } = await supabase
      .from('app_settings')
      .upsert(
        { account_id: activeAccountId, key: `kanban_msg_${n}`, value } as any,
        { onConflict: 'account_id,key' }
      );
    if (error) {
      toast.error('Erro ao salvar mensagem: ' + error.message);
      return;
    }
    setTemplates(prev => ({ ...prev, [n]: value }));
    toast.success(`Mensagem da fase ${n} salva`);
    setEditingPhaseN(null);
    setDraftMessage('');
  }, [editingPhaseN, draftMessage, activeAccountId]);

  const insertPlaceholder = (ph: string) => {
    setDraftMessage(prev => prev + ph);
  };

  // Group clientes by column, keeping a stable sort by id (oldest first)
  // to prevent cards from jumping positions when their data changes.
  const columns = useMemo(() => {
    const grouped: Record<number, Cliente[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    const sorted = [...clientes].sort((a, b) => a.id - b.id);
    for (const c of sorted) {
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

  const editingFase = editingPhaseN ? FASES.find(f => f.n === editingPhaseN) : null;

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
            onEditTemplate={openEditTemplate}
            templates={templates}
          />
        ))}
      </div>

      {/* Edit template dialog */}
      <Dialog open={editingPhaseN !== null} onOpenChange={open => { if (!open) { setEditingPhaseN(null); setDraftMessage(''); } }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Mensagem da fase {editingPhaseN} — {editingFase?.titulo}</DialogTitle>
            <DialogDescription>
              Esta é a mensagem que aparecerá pré-preenchida ao clicar no botão WhatsApp dos cards desta coluna. Use os placeholders abaixo para inserir o nome do cliente ou vendedor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => insertPlaceholder('{{primeiro_nome}}')} className="text-xs">+ Primeiro nome</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => insertPlaceholder('{{nome_completo}}')} className="text-xs">+ Nome completo</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => insertPlaceholder('{{vendedor}}')} className="text-xs">+ Vendedor</Button>
            </div>

            <Textarea
              value={draftMessage}
              onChange={e => setDraftMessage(e.target.value)}
              placeholder="Digite a mensagem..."
              className="min-h-[160px] text-sm"
              autoFocus
            />

            <div className="rounded-md bg-secondary/50 border border-border/30 p-2">
              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Pré-visualização (exemplo: João Silva / Bianca)</p>
              <p className="text-xs text-foreground whitespace-pre-wrap">
                {draftMessage
                  .replace(/\{\{primeiro_nome\}\}/g, 'João')
                  .replace(/\{\{nome_completo\}\}/g, 'João Silva')
                  .replace(/\{\{vendedor\}\}/g, 'Bianca')
                  || <span className="text-muted-foreground/60">(mensagem vazia)</span>}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingPhaseN(null); setDraftMessage(''); }}>Cancelar</Button>
            <Button onClick={saveTemplate}>Salvar mensagem</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DndContext>
  );
}

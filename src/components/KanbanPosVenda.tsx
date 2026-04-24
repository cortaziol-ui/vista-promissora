import { useMemo, useState, useEffect, useCallback } from 'react';
import { Cliente } from '@/contexts/SalesDataContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, Check, Pencil, Settings, Plus, Layers, Trash2 } from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext';
import { useKanbanPhases, KanbanPhase, TriggerType } from '@/hooks/useKanbanPhases';
import GerenciarFasesDialog from './GerenciarFasesDialog';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Parse DD/MM/YYYY → Date
function parseBR(d: string): Date | null {
  if (!d) return null;
  const parts = d.split('/');
  if (parts.length !== 3) return null;
  const dt = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  return isNaN(dt.getTime()) ? null : dt;
}

/**
 * Determines which phase_n a cliente is currently in.
 *
 * Usa a lista dinâmica de fases da account (ordenadas por `ordem`). Itera sobre
 * as fases ativas (na ordem de exibição) e encontra a primeira não concluída.
 * Retorna o `phase_n` da fase (não a ordem), pois `phase_n` é o ID usado em
 * `cliente.contatos[].n`.
 *
 * Override manual: armazenado em contatos[0].obs como `__col__=N` (onde N é phase_n).
 */
export function getColumnOfCliente(cliente: Cliente, phases: KanbanPhase[]): number {
  // Manual override: read from first contato's metadata
  const override = cliente.contatos?.[0]?.obs?.match(/__col__=(\d+)/)?.[1];
  if (override) {
    const overrideN = Number(override);
    // Se a fase override ainda existe, respeita. Senão, recalcula.
    if (phases.some(p => p.phase_n === overrideN)) return overrideN;
  }

  if (phases.length === 0) return 1;
  const orderedPhases = [...phases].sort((a, b) => a.ordem - b.ordem);
  const firstPhaseN = orderedPhases[0].phase_n;

  const contatos = cliente.contatos;
  if (!contatos || contatos.length === 0) return firstPhaseN;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentPhaseN = firstPhaseN;
  for (let i = 0; i < orderedPhases.length; i++) {
    const phase = orderedPhases[i];
    const contato = contatos.find(c => c.n === phase.phase_n);
    if (!contato || contato.status !== 'feito') {
      currentPhaseN = phase.phase_n;
      break;
    }
    const next = orderedPhases[i + 1];
    if (!next) {
      // Todas as fases concluídas — fica na última
      currentPhaseN = phase.phase_n;
      break;
    }
    const nextContato = contatos.find(c => c.n === next.phase_n);
    const nextDate = parseBR(nextContato?.data || '');
    if (!nextDate || nextDate.getTime() > today.getTime()) {
      // Próxima fase ainda não triggou — cliente espera na atual
      currentPhaseN = phase.phase_n;
      break;
    }
    // Próxima fase triggou — avança
    currentPhaseN = next.phase_n;
  }
  return currentPhaseN;
}

interface KanbanProps {
  clientes: Cliente[];
  onEditCliente: (c: Cliente) => void;
  onMoveCliente: (clienteId: number, newCol: number) => void;
  onMarkContatoFeito: (cliente: Cliente, contatoN: number) => void;
}

// Default message used when nothing is saved for a phase
const DEFAULT_MESSAGE = 'Olá {{primeiro_nome}}! [edite esta mensagem]';

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

function buildWhatsappLink(cliente: Cliente, phaseN: number, templates: Record<number, string>): string {
  const digits = (cliente.telefone || '').replace(/\D/g, '');
  const phone = digits.startsWith('55') ? digits : digits.length >= 10 ? '55' + digits : digits;
  const template = templates[phaseN] || DEFAULT_MESSAGE;
  const rendered = renderMessage(template, cliente).normalize('NFC');
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
  const totalContatos = cliente.contatos?.length || 0;

  const nomeFormatado = toTitleCase(cliente.nome);
  const vendedorFormatado = toTitleCase(cliente.vendedor || '');
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
          {feitos}/{totalContatos || '?'}
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
  phase,
  clientes,
  onEditCliente,
  onMarkFeito,
  onEditTemplate,
  templates,
}: {
  phase: KanbanPhase;
  clientes: Cliente[];
  onEditCliente: (c: Cliente) => void;
  onMarkFeito: (c: Cliente, n: number) => void;
  onEditTemplate: (phase: KanbanPhase) => void;
  templates: Record<number, string>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${phase.phase_n}` });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[240px] max-w-[280px] rounded-lg bg-secondary/30 border ${isOver ? 'border-primary/70 bg-primary/5' : 'border-border/30'} flex flex-col transition-colors`}
    >
      <div className="p-3 border-b border-border/30 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
              {phase.ordem}
            </span>
            <p className="text-sm font-semibold text-foreground truncate" title={phase.titulo}>{phase.titulo}</p>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 shrink-0 hover:bg-primary/20 hover:text-primary"
              onClick={() => onEditTemplate(phase)}
              title="Editar título e mensagem da fase"
            >
              <Settings className="w-3.5 h-3.5" />
            </Button>
          </div>
          <Badge variant="secondary" className="text-xs shrink-0">{clientes.length}</Badge>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Gatilho: {phase.gatilho}</p>
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
              column={phase.phase_n}
              onEdit={() => onEditCliente(c)}
              onMarkFeito={() => onMarkFeito(c, phase.phase_n)}
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
  const { isAdmin } = useAuth();
  const { phases, loading: loadingPhases, addPhase, updatePhase, deletePhase, reorderPhases } = useKanbanPhases();

  const [templates, setTemplates] = useState<Record<number, string>>({});
  // Phase being edited: null = closed, 'new' = creating new, KanbanPhase = editing existing
  const [editingPhase, setEditingPhase] = useState<KanbanPhase | 'new' | null>(null);
  const [draftMessage, setDraftMessage] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftTriggerType, setDraftTriggerType] = useState<TriggerType>('manual');
  const [draftTriggerDays, setDraftTriggerDays] = useState<string>('');
  const [draftTriggerRefN, setDraftTriggerRefN] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [confirmDeletePhase, setConfirmDeletePhase] = useState<KanbanPhase | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Load saved WhatsApp messages (kept in app_settings, not in kanban_phases)
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
      const loaded: Record<number, string> = {};
      for (const row of data) {
        const m = String(row.key).match(/^kanban_msg_(\d+)$/);
        if (m) loaded[Number(m[1])] = String(row.value ?? '');
      }
      setTemplates(loaded);
    })();
    return () => { cancelled = true; };
  }, [activeAccountId]);

  const orderedPhases = useMemo(() => [...phases].sort((a, b) => a.ordem - b.ordem), [phases]);

  const openEditTemplate = (phase: KanbanPhase) => {
    setEditingPhase(phase);
    setDraftMessage(templates[phase.phase_n] ?? DEFAULT_MESSAGE);
    setDraftTitle(phase.titulo);
    setDraftTriggerType(phase.trigger_type);
    setDraftTriggerDays(phase.trigger_days != null ? String(phase.trigger_days) : '');
    setDraftTriggerRefN(phase.trigger_ref_phase_n != null ? String(phase.trigger_ref_phase_n) : '');
  };

  const openNewPhase = () => {
    setEditingPhase('new');
    setDraftMessage(DEFAULT_MESSAGE);
    setDraftTitle('');
    setDraftTriggerType('manual');
    setDraftTriggerDays('');
    setDraftTriggerRefN('');
  };

  const closeDialog = () => {
    setEditingPhase(null);
    setDraftMessage('');
    setDraftTitle('');
    setDraftTriggerType('manual');
    setDraftTriggerDays('');
    setDraftTriggerRefN('');
  };

  const saveTemplate = useCallback(async () => {
    if (editingPhase == null || !activeAccountId) return;
    const title = draftTitle.trim();
    if (!title) { toast.error('Título não pode ficar em branco'); return; }
    setSaving(true);

    const trigger_days = draftTriggerType === 'manual' ? null : (draftTriggerDays ? Number(draftTriggerDays) : 0);
    const trigger_ref_phase_n = draftTriggerType === 'apos_fase' && draftTriggerRefN ? Number(draftTriggerRefN) : null;

    let phaseN: number;
    if (editingPhase === 'new') {
      const created = await addPhase({
        titulo: title,
        trigger_type: draftTriggerType,
        trigger_days,
        trigger_ref_phase_n,
      });
      if (!created) { toast.error('Erro ao criar fase'); setSaving(false); return; }
      phaseN = created.phase_n;
    } else {
      const ok = await updatePhase(editingPhase.id, {
        titulo: title,
        trigger_type: draftTriggerType,
        trigger_days,
        trigger_ref_phase_n,
      });
      if (!ok) { toast.error('Erro ao atualizar fase'); setSaving(false); return; }
      phaseN = editingPhase.phase_n;
    }

    // Save message (app_settings keyed by phase_n)
    const { error: msgErr } = await supabase
      .from('app_settings')
      .upsert(
        { account_id: activeAccountId, key: `kanban_msg_${phaseN}`, value: draftMessage },
        { onConflict: 'account_id,key' }
      );
    if (msgErr) { toast.error('Erro ao salvar mensagem: ' + msgErr.message); setSaving(false); return; }

    setTemplates(prev => ({ ...prev, [phaseN]: draftMessage }));
    toast.success(editingPhase === 'new' ? 'Fase criada' : 'Fase atualizada');
    setSaving(false);
    closeDialog();
  }, [editingPhase, activeAccountId, draftTitle, draftMessage, draftTriggerType, draftTriggerDays, draftTriggerRefN, addPhase, updatePhase]);

  const handleDeletePhase = async () => {
    if (!confirmDeletePhase) return;
    const ok = await deletePhase(confirmDeletePhase.id);
    if (ok) {
      toast.success(`Fase "${confirmDeletePhase.titulo}" excluída`);
      closeDialog();
    } else {
      toast.error('Erro ao excluir fase');
    }
    setConfirmDeletePhase(null);
  };

  const insertPlaceholder = (ph: string) => {
    setDraftMessage(prev => prev + ph);
  };

  // Group clientes by column (phase_n), stable sort by id
  const columns = useMemo(() => {
    const grouped: Record<number, Cliente[]> = {};
    for (const p of orderedPhases) grouped[p.phase_n] = [];
    const sorted = [...clientes].sort((a, b) => a.id - b.id);
    for (const c of sorted) {
      const col = getColumnOfCliente(c, orderedPhases);
      if (grouped[col]) {
        grouped[col].push(c);
      } else if (orderedPhases.length > 0) {
        // Cliente em fase que foi deletada — cai na primeira fase ativa
        grouped[orderedPhases[0].phase_n].push(c);
      }
    }
    return grouped;
  }, [clientes, orderedPhases]);

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

  const isEditingExisting = editingPhase !== null && editingPhase !== 'new';
  const dialogTitle = editingPhase === 'new' ? 'Nova fase' : `Configurar fase${isEditingExisting ? ` "${(editingPhase as KanbanPhase).titulo}"` : ''}`;
  // Fases disponíveis como referência de gatilho (excluindo a própria quando editando)
  const availableRefPhases = orderedPhases.filter(p => !isEditingExisting || p.id !== (editingPhase as KanbanPhase).id);

  if (loadingPhases) {
    return <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Carregando fases...</div>;
  }

  if (orderedPhases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-sm text-muted-foreground">Nenhuma fase configurada para esta subconta.</p>
        {isAdmin && (
          <Button onClick={openNewPhase}>
            <Plus className="w-4 h-4 mr-2" /> Criar primeira fase
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {isAdmin && (
        <div className="flex items-center gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => setManageOpen(true)}>
            <Layers className="w-4 h-4 mr-2" /> Gerenciar fases
          </Button>
          <Button size="sm" onClick={openNewPhase}>
            <Plus className="w-4 h-4 mr-2" /> Nova fase
          </Button>
        </div>
      )}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-3">
          {orderedPhases.map(phase => (
            <Coluna
              key={phase.id}
              phase={phase}
              clientes={columns[phase.phase_n] || []}
              onEditCliente={onEditCliente}
              onMarkFeito={onMarkContatoFeito}
              onEditTemplate={openEditTemplate}
              templates={templates}
            />
          ))}
        </div>
      </DndContext>

      {/* Edit/create phase dialog */}
      <Dialog open={editingPhase !== null} onOpenChange={open => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              Edite o título, mensagem padrão do WhatsApp e (se admin) o gatilho da fase.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Phase title */}
            <div className="space-y-1.5">
              <Label className="text-xs">Título da fase</Label>
              <Input
                value={draftTitle}
                onChange={e => setDraftTitle(e.target.value)}
                placeholder="Ex: Cobrança 1ª parcela"
                className="text-sm"
              />
            </div>

            {/* Trigger config (admin only) */}
            {isAdmin && (
              <div className="space-y-2 pt-2 border-t border-border/30">
                <Label className="text-xs">Gatilho automático</Label>
                <Select value={draftTriggerType} onValueChange={(v) => setDraftTriggerType(v as TriggerType)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual (mover a mão)</SelectItem>
                    <SelectItem value="apos_venda">X dias após a venda</SelectItem>
                    <SelectItem value="apos_fase">X dias após outra fase</SelectItem>
                  </SelectContent>
                </Select>

                {draftTriggerType === 'apos_venda' && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={draftTriggerDays}
                      onChange={e => setDraftTriggerDays(e.target.value)}
                      placeholder="Dias"
                      className="text-sm w-24"
                    />
                    <span className="text-xs text-muted-foreground">dias após a data da venda</span>
                  </div>
                )}

                {draftTriggerType === 'apos_fase' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input
                      type="number"
                      min={0}
                      value={draftTriggerDays}
                      onChange={e => setDraftTriggerDays(e.target.value)}
                      placeholder="Dias"
                      className="text-sm w-24"
                    />
                    <span className="text-xs text-muted-foreground">dias após</span>
                    <Select value={draftTriggerRefN} onValueChange={setDraftTriggerRefN}>
                      <SelectTrigger className="text-sm flex-1 min-w-[180px]">
                        <SelectValue placeholder="Escolher fase de referência" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRefPhases.map(p => (
                          <SelectItem key={p.id} value={String(p.phase_n)}>{p.titulo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Message template */}
            <div className="space-y-2 pt-2 border-t border-border/30">
              <Label className="text-xs">Mensagem do WhatsApp</Label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => insertPlaceholder('{{primeiro_nome}}')} className="text-xs">+ Primeiro nome</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => insertPlaceholder('{{nome_completo}}')} className="text-xs">+ Nome completo</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => insertPlaceholder('{{vendedor}}')} className="text-xs">+ Vendedor</Button>
              </div>

              <Textarea
                value={draftMessage}
                onChange={e => setDraftMessage(e.target.value)}
                placeholder="Digite a mensagem..."
                className="min-h-[140px] text-sm"
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
          </div>

          <DialogFooter className="flex flex-row justify-between sm:justify-between">
            {isAdmin && isEditingExisting ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:bg-red-500/20 hover:text-red-400"
                onClick={() => setConfirmDeletePhase(editingPhase as KanbanPhase)}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Excluir fase
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={closeDialog} disabled={saving}>Cancelar</Button>
              <Button onClick={saveTemplate} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete phase */}
      <AlertDialog open={confirmDeletePhase !== null} onOpenChange={(o) => { if (!o) setConfirmDeletePhase(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fase "{confirmDeletePhase?.titulo}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Clientes nesta fase serão movidos para a fase anterior. As mensagens salvas permanecem preservadas caso a fase seja reativada no futuro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePhase} className="bg-red-500 hover:bg-red-600 text-white">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage phases (reorder) */}
      <GerenciarFasesDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        phases={orderedPhases}
        onReorder={reorderPhases}
        onDelete={deletePhase}
      />
    </div>
  );
}

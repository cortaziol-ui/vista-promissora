import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2, Pencil, Plus } from 'lucide-react';
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { KanbanPhase } from '@/hooks/useKanbanPhases';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phases: KanbanPhase[];
  onReorder: (orderedIds: string[]) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onEditPhase: (phase: KanbanPhase) => void;
  onCreatePhase: () => void;
}

function SortableItem({
  phase, onDelete, onEdit,
}: {
  phase: KanbanPhase;
  onDelete: (id: string) => void;
  onEdit: (phase: KanbanPhase) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: phase.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 rounded-md bg-secondary/50 border border-border/50 hover:border-primary/50 hover:bg-secondary/70 transition-colors cursor-pointer"
      onClick={() => onEdit(phase)}
      title="Clique para editar título, mensagem e gatilho"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        onClick={e => e.stopPropagation()}
        {...attributes}
        {...listeners}
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{phase.titulo}</p>
        <p className="text-[10px] text-muted-foreground">Gatilho: {phase.gatilho}</p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 text-muted-foreground hover:bg-blue-500/20 hover:text-blue-400"
        onClick={e => { e.stopPropagation(); onEdit(phase); }}
        title="Editar título, mensagem e gatilho"
      >
        <Pencil className="w-3.5 h-3.5" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 text-muted-foreground hover:bg-red-500/20 hover:text-red-400"
        onClick={e => { e.stopPropagation(); onDelete(phase.id); }}
        title="Excluir fase"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

export default function GerenciarFasesDialog({ open, onOpenChange, phases, onReorder, onDelete, onEditPhase, onCreatePhase }: Props) {
  const [items, setItems] = useState<KanbanPhase[]>(phases);
  const [deleteTarget, setDeleteTarget] = useState<KanbanPhase | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setItems(phases); setDirty(false); }, [phases, open]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setItems(prev => arrayMove(prev, oldIndex, newIndex));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!dirty) { onOpenChange(false); return; }
    setSaving(true);
    const ok = await onReorder(items.map(i => i.id));
    setSaving(false);
    if (ok) {
      toast.success('Ordem das fases atualizada');
      setDirty(false);
      onOpenChange(false);
    } else {
      toast.error('Erro ao reordenar fases');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const ok = await onDelete(deleteTarget.id);
    if (ok) {
      toast.success(`Fase "${deleteTarget.titulo}" excluída`);
      setItems(prev => prev.filter(p => p.id !== deleteTarget.id));
    } else {
      toast.error('Erro ao excluir fase');
    }
    setDeleteTarget(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerenciar fases do kanban</DialogTitle>
            <DialogDescription>
              Clique numa fase para editar título, mensagem e gatilho. Arraste pela alça para reordenar. Exclua fases que não usa mais — clientes migram para a fase anterior.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {items.map(phase => (
                    <SortableItem
                      key={phase.id}
                      phase={phase}
                      onDelete={(id) => {
                        const target = items.find(i => i.id === id);
                        if (target) setDeleteTarget(target);
                      }}
                      onEdit={onEditPhase}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3 border-dashed"
              onClick={onCreatePhase}
            >
              <Plus className="w-4 h-4 mr-2" /> Adicionar nova fase
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Fechar</Button>
            <Button onClick={handleSave} disabled={saving || !dirty}>
              {saving ? 'Salvando...' : dirty ? 'Salvar ordem' : 'Ordem salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fase "{deleteTarget?.titulo}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Clientes que estiverem nesta fase serão movidos para a fase anterior. Esta ação pode ser revertida reabilitando a fase via banco. As mensagens de WhatsApp salvas são preservadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-500 hover:bg-red-600 text-white">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

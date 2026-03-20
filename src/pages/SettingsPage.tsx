import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSalesData } from '@/contexts/SalesDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, UserPlus, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';

const fmtFull = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function SettingsPage() {
  const { isAdmin, isManager } = useAuth();
  const { vendedores, metaMensalGlobal, setMetaMensalGlobal, updateVendedor } = useSalesData();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'seller', monthlyGoal: 50000 });

  // Inline editing state
  const [editingMetaGlobal, setEditingMetaGlobal] = useState(false);
  const [metaGlobalDraft, setMetaGlobalDraft] = useState(metaMensalGlobal);
  const [editingVendorId, setEditingVendorId] = useState<number | null>(null);
  const [vendorMetaDraft, setVendorMetaDraft] = useState(0);

  const handleSaveMetaGlobal = () => {
    if (metaGlobalDraft > 0) {
      setMetaMensalGlobal(metaGlobalDraft);
      toast({ title: 'Meta atualizada', description: `Meta da empresa alterada para ${fmtFull(metaGlobalDraft)}` });
    }
    setEditingMetaGlobal(false);
  };

  const handleStartEditVendor = (id: number, currentMeta: number) => {
    setEditingVendorId(id);
    setVendorMetaDraft(currentMeta);
  };

  const handleSaveVendorMeta = (id: number, nome: string) => {
    if (vendorMetaDraft >= 0) {
      updateVendedor(id, { meta: vendorMetaDraft });
      toast({ title: 'Meta atualizada', description: `Meta de ${nome} alterada para ${fmtFull(vendorMetaDraft)}` });
    }
    setEditingVendorId(null);
  };

  const handleAddUser = () => {
    toast({ title: 'Vendedor adicionado', description: `${newUser.name} foi adicionado ao sistema.` });
    setDialogOpen(false);
    setNewUser({ name: '', email: '', password: '', role: 'seller', monthlyGoal: 50000 });
  };

  if (!isAdmin && !isManager) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-foreground">Configurações</h1>

      {isAdmin && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Meta da Empresa</h2>
          <p className="text-sm text-muted-foreground mb-2">Meta Mensal Global (independente das metas individuais)</p>
          {editingMetaGlobal ? (
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">R$</span>
              <Input
                type="number"
                value={metaGlobalDraft}
                onChange={e => setMetaGlobalDraft(Number(e.target.value))}
                className="bg-secondary border-border/50 w-48"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSaveMetaGlobal()}
              />
              <Button size="sm" variant="ghost" onClick={handleSaveMetaGlobal}>
                <Check className="w-4 h-4 text-green-500" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingMetaGlobal(false)}>
                <X className="w-4 h-4 text-red-400" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-2xl font-bold text-foreground">{fmtFull(metaMensalGlobal)}</p>
              <Button size="sm" variant="ghost" onClick={() => { setMetaGlobalDraft(metaMensalGlobal); setEditingMetaGlobal(true); }}>
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Soma das metas individuais: {fmtFull(vendedores.reduce((s, v) => s + v.meta, 0))}
          </p>
        </div>
      )}

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Vendedores</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><UserPlus className="w-4 h-4 mr-2" />Adicionar</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Novo Vendedor</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">Nome</label>
                  <Input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} className="bg-secondary border-border/50 mt-1" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Email</label>
                  <Input value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className="bg-secondary border-border/50 mt-1" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Meta Mensal</label>
                  <Input type="number" value={newUser.monthlyGoal} onChange={e => setNewUser({ ...newUser, monthlyGoal: Number(e.target.value) })} className="bg-secondary border-border/50 mt-1" />
                </div>
                <Button onClick={handleAddUser} className="w-full">Salvar Vendedor</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-border/50">
                <th className="text-left py-3 px-2">Nome</th>
                <th className="text-left py-3 px-2">Cargo</th>
                <th className="text-right py-3 px-2">Meta Mensal</th>
                <th className="text-center py-3 px-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {vendedores.map(v => (
                <tr key={v.id} className="border-b border-border/30 hover:bg-secondary/50 transition-colors">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{v.avatar}</span>
                      <span className="text-foreground font-medium">{v.nome}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-muted-foreground">{v.cargo}</td>
                  <td className="py-3 px-2 text-right">
                    {editingVendorId === v.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-muted-foreground text-xs">R$</span>
                        <Input
                          type="number"
                          value={vendorMetaDraft}
                          onChange={e => setVendorMetaDraft(Number(e.target.value))}
                          className="bg-secondary border-border/50 w-32 text-right"
                          autoFocus
                          onKeyDown={e => e.key === 'Enter' && handleSaveVendorMeta(v.id, v.nome)}
                        />
                        <Button size="sm" variant="ghost" onClick={() => handleSaveVendorMeta(v.id, v.nome)}>
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingVendorId(null)}>
                          <X className="w-3.5 h-3.5 text-red-400" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-foreground">{fmtFull(v.meta)}</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleStartEditVendor(v.id, v.meta)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      {isAdmin && (
                        <Button variant="ghost" size="sm" onClick={() => toast({ title: 'Excluir', description: `${v.nome} removido` })}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

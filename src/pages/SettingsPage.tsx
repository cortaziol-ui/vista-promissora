import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSalesData } from '@/contexts/SalesDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';

const fmtFull = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function SettingsPage() {
  const { isAdmin, isManager } = useAuth();
  const { vendedores, metaMensalGlobal } = useSalesData();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'seller' as string, monthlyGoal: 50000 });

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
          <p className="text-sm text-muted-foreground mb-2">Meta Mensal Global</p>
          <p className="text-2xl font-bold text-foreground">{fmtFull(metaMensalGlobal)}</p>
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
                  <td className="py-3 px-2 text-right text-foreground">{fmtFull(v.meta)}</td>
                  <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => toast({ title: 'Editar', description: `Editando ${v.nome}` })}>
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

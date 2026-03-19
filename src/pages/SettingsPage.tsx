import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { users as allUsers, companyGoal } from '@/data/mockData';
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
  const { toast } = useToast();
  const [compGoal, setCompGoal] = useState(companyGoal);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'seller' as string, monthlyGoal: 50000, weeklyGoal: 12500 });

  const sellers = allUsers.filter(u => u.role === 'seller');

  const handleSaveGoal = () => {
    toast({ title: 'Salvo', description: 'Meta da empresa atualizada com sucesso.' });
  };

  const handleAddUser = () => {
    toast({ title: 'Vendedor adicionado', description: `${newUser.name} foi adicionado ao sistema.` });
    setDialogOpen(false);
    setNewUser({ name: '', email: '', password: '', role: 'seller', monthlyGoal: 50000, weeklyGoal: 12500 });
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

      {/* Company Goal */}
      {isAdmin && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Meta da Empresa</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Meta Mensal</label>
              <Input type="number" value={compGoal.monthlyGoal} onChange={e => setCompGoal({ ...compGoal, monthlyGoal: Number(e.target.value) })} className="bg-secondary border-border/50 mt-1" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Meta Anual</label>
              <Input type="number" value={compGoal.annualGoal} onChange={e => setCompGoal({ ...compGoal, annualGoal: Number(e.target.value) })} className="bg-secondary border-border/50 mt-1" />
            </div>
          </div>
          <Button onClick={handleSaveGoal} className="mt-4">Salvar Meta</Button>
        </div>
      )}

      {/* Sellers Management */}
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
                  <label className="text-sm text-muted-foreground">Senha Inicial</label>
                  <Input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="bg-secondary border-border/50 mt-1" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Cargo</label>
                  <Select value={newUser.role} onValueChange={v => setNewUser({ ...newUser, role: v })}>
                    <SelectTrigger className="bg-secondary border-border/50 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seller">Vendedor</SelectItem>
                      {isAdmin && <SelectItem value="manager">Gerente</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground">Meta Mensal</label>
                    <Input type="number" value={newUser.monthlyGoal} onChange={e => setNewUser({ ...newUser, monthlyGoal: Number(e.target.value) })} className="bg-secondary border-border/50 mt-1" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Meta Semanal</label>
                    <Input type="number" value={newUser.weeklyGoal} onChange={e => setNewUser({ ...newUser, weeklyGoal: Number(e.target.value) })} className="bg-secondary border-border/50 mt-1" />
                  </div>
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
                <th className="text-left py-3 px-2">Email</th>
                <th className="text-left py-3 px-2">Cargo</th>
                <th className="text-right py-3 px-2">Meta Mensal</th>
                <th className="text-right py-3 px-2">Meta Semanal</th>
                <th className="text-center py-3 px-2">Status</th>
                <th className="text-center py-3 px-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sellers.map(u => (
                <tr key={u.id} className="border-b border-border/30 hover:bg-secondary/50 transition-colors">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full bg-secondary" />
                      <span className="text-foreground font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-muted-foreground">{u.email}</td>
                  <td className="py-3 px-2 text-muted-foreground capitalize">{u.position}</td>
                  <td className="py-3 px-2 text-right text-foreground">{fmtFull(u.monthlyGoal)}</td>
                  <td className="py-3 px-2 text-right text-foreground">{fmtFull(u.weeklyGoal)}</td>
                  <td className="py-3 px-2 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${u.status === 'active' ? 'bg-kpi-success/20 text-kpi-success' : 'bg-kpi-error/20 text-kpi-error'}`}>
                      {u.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => toast({ title: 'Editar', description: `Editando ${u.name}` })}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      {isAdmin && (
                        <Button variant="ghost" size="sm" onClick={() => toast({ title: 'Excluir', description: `${u.name} removido` })}>
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

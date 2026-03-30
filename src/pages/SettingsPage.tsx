import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MetaAdsIntegration from '@/components/MetaAdsIntegration';
import { useSalesData } from '@/contexts/SalesDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, UserPlus, Check, X, Sparkles, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const fmtFull = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const MESES = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

export default function SettingsPage() {
  const { isAdmin, isManager } = useAuth();
  const { vendedores, metaMensalGlobal, setMetaMensalGlobal, addVendedor, updateVendedor, deleteVendedor, clientes } = useSalesData();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'seller', monthlyGoal: 50000 });

  // Month selector
  const currentMonth = new Date().toISOString().slice(5, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Inline editing state
  const [editingMetaGlobal, setEditingMetaGlobal] = useState(false);
  const [metaGlobalDraft, setMetaGlobalDraft] = useState(metaMensalGlobal);
  const [editingVendorId, setEditingVendorId] = useState<number | null>(null);
  const [vendorMetaDraft, setVendorMetaDraft] = useState(0);

  // Suggested goals state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestedGoals, setSuggestedGoals] = useState<Record<number, number>>({});

  // Calculate proportional suggested goals (+20% buffer)
  const calculateSuggestedGoals = useMemo(() => {
    const totalFaturamento = vendedores.reduce((sum, v) => {
      const vendorClientes = clientes.filter(c => c.vendedor === v.nome);
      return sum + vendorClientes.reduce((s, c) => s + (c.entrada || 0), 0);
    }, 0);

    if (totalFaturamento === 0) {
      // Equal distribution when no sales data
      const equalShare = (metaMensalGlobal * 1.2) / vendedores.length;
      return vendedores.reduce((acc, v) => {
        acc[v.id] = Math.round(equalShare);
        return acc;
      }, {} as Record<number, number>);
    }

    // Proportional based on sales performance, total = meta * 1.2
    const targetTotal = metaMensalGlobal * 1.2;
    return vendedores.reduce((acc, v) => {
      const vendorClientes = clientes.filter(c => c.vendedor === v.nome);
      const vendorFat = vendorClientes.reduce((s, c) => s + (c.entrada || 0), 0);
      const proportion = vendorFat / totalFaturamento;
      acc[v.id] = Math.round(targetTotal * proportion);
      return acc;
    }, {} as Record<number, number>);
  }, [vendedores, clientes, metaMensalGlobal]);

  const handleSaveMetaGlobal = () => {
    if (metaGlobalDraft > 0) {
      setMetaMensalGlobal(metaGlobalDraft);
      toast({ title: 'Meta atualizada', description: `Meta de ${MESES.find(m => m.value === selectedMonth)?.label} alterada para ${fmtFull(metaGlobalDraft)}` });
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

  const handleGenerateSuggestions = () => {
    setSuggestedGoals(calculateSuggestedGoals);
    setShowSuggestions(true);
  };

  const handleApproveSuggestions = () => {
    vendedores.forEach(v => {
      if (suggestedGoals[v.id] !== undefined) {
        updateVendedor(v.id, { meta: suggestedGoals[v.id] });
      }
    });
    setShowSuggestions(false);
    toast({ title: 'Metas aplicadas', description: 'As metas sugeridas foram aplicadas a todos os vendedores.' });
  };

  const handleRejectSuggestions = () => {
    setShowSuggestions(false);
  };

  const handleAddUser = async () => {
    if (!newUser.name.trim()) {
      toast({ title: 'Erro', description: 'Nome é obrigatório.', variant: 'destructive' });
      return;
    }
    const result = await addVendedor({
      nome: newUser.name.trim(),
      cargo: 'Vendedor',
      meta: newUser.monthlyGoal,
      avatar: '👤',
    });
    if (result) {
      toast({ title: 'Vendedor adicionado', description: `${newUser.name} foi adicionado ao sistema.` });
    } else {
      toast({ title: 'Erro', description: 'Falha ao salvar vendedor.', variant: 'destructive' });
    }
    setDialogOpen(false);
    setNewUser({ name: '', email: '', password: '', role: 'seller', monthlyGoal: 50000 });
  };

  const somaMetasIndividuais = vendedores.reduce((s, v) => s + v.meta, 0);
  const somaSugeridas = Object.values(suggestedGoals).reduce((s, v) => s + v, 0);

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
          
          {/* Month selector */}
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Mês de referência:</span>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px] bg-secondary border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESES.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
            Soma das metas individuais: {fmtFull(somaMetasIndividuais)}
          </p>
          <p className="text-xs text-muted-foreground">
            💡 Se cada vendedor atingir 80% da sua meta individual, a meta da empresa deve ser batida.
          </p>
        </div>
      )}

      {/* Suggested Goals Banner */}
      {showSuggestions && (
        <div className="glass-card p-6 border border-kpi-goal-pct/30">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-kpi-goal-pct" />
            <h2 className="text-lg font-semibold text-foreground">Sugestão de Metas Individuais</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-1">
            Baseado na performance proporcional de cada vendedor, com 20% de margem sobre a meta da empresa ({fmtFull(metaMensalGlobal)}).
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Soma das metas sugeridas: <span className="text-foreground font-medium">{fmtFull(somaSugeridas)}</span> (= {fmtFull(metaMensalGlobal)} × 1.2)
          </p>

          <div className="space-y-2 mb-4">
            {vendedores.map(v => {
              const suggested = suggestedGoals[v.id] || 0;
              return (
                <div key={v.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{v.avatar}</span>
                    <span className="text-foreground font-medium">{v.nome}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground text-sm">Atual: {fmtFull(v.meta)}</span>
                    <span className="text-foreground font-semibold">→ {fmtFull(suggested)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <Button onClick={handleApproveSuggestions} className="bg-green-600 hover:bg-green-700">
              <Check className="w-4 h-4 mr-2" />
              Aprovar e Aplicar
            </Button>
            <Button variant="outline" onClick={handleRejectSuggestions}>
              <X className="w-4 h-4 mr-2" />
              Recusar (manter atuais)
            </Button>
          </div>
        </div>
      )}

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Vendedores</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleGenerateSuggestions}>
              <Sparkles className="w-4 h-4 mr-2 text-kpi-goal-pct" />
              Sugerir Metas
            </Button>
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
                        <Button variant="ghost" size="sm" onClick={() => { deleteVendedor(v.id); toast({ title: 'Excluído', description: `${v.nome} foi removido.` }); }}>
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

      {isAdmin && <MetaAdsIntegration />}
    </div>
  );
}

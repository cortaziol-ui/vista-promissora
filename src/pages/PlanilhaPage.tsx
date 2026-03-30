import { useState, useMemo } from 'react';
import { useSalesData, Cliente } from '@/contexts/SalesDataContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Download, Search, Pencil, Trash2, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

const fmtCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const situacaoColors: Record<string, string> = {
  'ENVIADO - AGUARDANDO LIMPAR': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'SERVIÇO RATING FINALIZADO': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'SERVIÇO FINALIZADO': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'CANCELADO': 'bg-red-500/20 text-red-400 border-red-500/30',
};

const parcelaIcon = (s: string) => s === 'PAGO' ? '✅' : s === 'CANCELADO' ? '❌' : '⏳';

const ITEMS_PER_PAGE = 20;

function makeEmptyCliente(selectedMonth: string): Omit<Cliente, 'id'> {
  const [y, m] = selectedMonth.split('-');
  const defaultDate = `01/${m}/${y}`;
  return {
    data: defaultDate,
    nome: '', cpf: '', nascimento: '', email: '', telefone: '',
    servico: 'LIMPA NOME', vendedor: '', entrada: 179,
    parcela1: { valor: 250, status: 'AGUARDANDO' },
    parcela2: { valor: 250, status: 'AGUARDANDO' },
    situacao: 'ENVIADO - AGUARDANDO LIMPAR',
    valorTotal: 679,
  };
}

export default function PlanilhaPage() {
  const { clientes, vendedores, addCliente, updateCliente, deleteCliente, selectedMonth, setSelectedMonth } = useSalesData();
  const [search, setSearch] = useState('');
  const [filterVendedor, setFilterVendedor] = useState('all');
  const [filterServico, setFilterServico] = useState('all');
  const [filterSituacao, setFilterSituacao] = useState('all');
  const [page, setPage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<Cliente, 'id'>>(makeEmptyCliente(selectedMonth));

  // Month navigation helpers
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const [selYear, selMonthNum] = selectedMonth.split('-').map(Number);
  const monthDisplay = `${monthNames[selMonthNum - 1]} ${selYear}`;

  const goToPrevMonth = () => {
    const d = new Date(selYear, selMonthNum - 2, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setPage(0);
  };
  const goToNextMonth = () => {
    const d = new Date(selYear, selMonthNum, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setPage(0);
  };

  // Filter clientes by selected month first, then by other filters
  const filtered = useMemo(() => {
    let data = clientes.filter(c => {
      if (!c.data) return false;
      const parts = c.data.split('/');
      if (parts.length !== 3) return false;
      const ym = `${parts[2]}-${parts[1].padStart(2, '0')}`;
      return ym === selectedMonth;
    });
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(c => c.nome.toLowerCase().includes(q) || c.cpf.includes(q) || c.email.toLowerCase().includes(q));
    }
    if (filterVendedor !== 'all') data = data.filter(c => c.vendedor === filterVendedor);
    if (filterServico !== 'all') data = data.filter(c => c.servico === filterServico);
    if (filterSituacao !== 'all') data = data.filter(c => c.situacao === filterSituacao);
    return data;
  }, [clientes, selectedMonth, search, filterVendedor, filterServico, filterSituacao]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  const situacoes = useMemo(() => [...new Set(clientes.map(c => c.situacao))], [clientes]);

  const openNew = () => { setEditingId(null); setForm(makeEmptyCliente(selectedMonth)); setModalOpen(true); };
  const openEdit = (c: Cliente) => { setEditingId(c.id); setForm({ ...c }); setModalOpen(true); };

  const handleSave = () => {
    const valorTotal = form.entrada + form.parcela1.valor + form.parcela2.valor;
    const data = { ...form, valorTotal };
    if (editingId !== null) {
      updateCliente(editingId, data);
    } else {
      addCliente(data);
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (deleteId !== null) { deleteCliente(deleteId); setDeleteId(null); }
  };

  const exportCSV = () => {
    const headers = ['ID', 'Data', 'Nome', 'CPF', 'Email', 'Telefone', 'Serviço', 'Vendedor', 'Entrada', 'Parcela 1', 'Status P1', 'Parcela 2', 'Status P2', 'Situação', 'Valor Total'];
    const rows = filtered.map(c => [c.id, c.data, c.nome, c.cpf, c.email, c.telefone, c.servico, c.vendedor, c.entrada, c.parcela1.valor, c.parcela1.status, c.parcela2.valor, c.parcela2.status, c.situacao, c.valorTotal].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'planilha_controle.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const updateFormField = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planilha de Controle</h1>
          <p className="text-muted-foreground text-sm">{filtered.length} registros</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Month navigator */}
          <div className="flex items-center gap-1 bg-secondary rounded-lg border border-border/50 px-1">
            <Button variant="ghost" size="sm" onClick={goToPrevMonth} className="h-8 w-8 p-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 px-3 min-w-[140px] justify-center">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{monthDisplay}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={goToNextMonth} className="h-8 w-8 p-0">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Novo Cliente</Button>
          <Button variant="outline" onClick={exportCSV} className="gap-2"><Download className="w-4 h-4" /> Exportar CSV</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, CPF ou email..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9 bg-secondary border-border/50" />
        </div>
        <Select value={filterVendedor} onValueChange={v => { setFilterVendedor(v); setPage(0); }}>
          <SelectTrigger className="w-[180px] bg-secondary border-border/50"><SelectValue placeholder="Vendedor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Vendedores</SelectItem>
            {vendedores.map(v => <SelectItem key={v.id} value={v.nome}>{v.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterServico} onValueChange={v => { setFilterServico(v); setPage(0); }}>
          <SelectTrigger className="w-[180px] bg-secondary border-border/50"><SelectValue placeholder="Serviço" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Serviços</SelectItem>
            <SelectItem value="LIMPA NOME">Limpa Nome</SelectItem>
            <SelectItem value="RATING">Rating</SelectItem>
            <SelectItem value="OUTROS">Outros</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSituacao} onValueChange={v => { setFilterSituacao(v); setPage(0); }}>
          <SelectTrigger className="w-[200px] bg-secondary border-border/50"><SelectValue placeholder="Situação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Situações</SelectItem>
            {situacoes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
              <tr className="text-muted-foreground border-b border-border/50 text-xs uppercase tracking-wider">
                <th className="text-left py-3 px-3">#</th>
                <th className="text-left py-3 px-3">Data</th>
                <th className="text-left py-3 px-3 min-w-[200px]">Cliente</th>
                <th className="text-left py-3 px-3">CPF</th>
                <th className="text-left py-3 px-3">Telefone</th>
                <th className="text-left py-3 px-3">Serviço</th>
                <th className="text-left py-3 px-3">Vendedor</th>
                <th className="text-right py-3 px-3">Entrada</th>
                <th className="text-center py-3 px-3">1ª Parcela</th>
                <th className="text-center py-3 px-3">2ª Parcela</th>
                <th className="text-left py-3 px-3 min-w-[180px]">Situação</th>
                <th className="text-right py-3 px-3">Total</th>
                <th className="text-center py-3 px-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((c, i) => (
                <tr key={c.id} className={`border-b border-border/20 hover:bg-secondary/40 transition-colors ${i % 2 === 0 ? 'bg-card/40' : 'bg-card/20'}`}>
                  <td className="py-3 px-3 text-muted-foreground">{c.id}</td>
                  <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">{c.data}</td>
                  <td className="py-3 px-3 font-medium text-foreground">{c.nome}</td>
                  <td className="py-3 px-3 text-muted-foreground font-mono text-xs">{c.cpf}</td>
                  <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">{c.telefone}</td>
                  <td className="py-3 px-3"><Badge variant="outline" className="text-xs">{c.servico}</Badge></td>
                  <td className="py-3 px-3 font-medium text-foreground">{c.vendedor}</td>
                  <td className="py-3 px-3 text-right text-foreground">{fmtCurrency(c.entrada)}</td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-xs">{parcelaIcon(c.parcela1.status)} {fmtCurrency(c.parcela1.valor)}</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-xs">{parcelaIcon(c.parcela2.status)} {fmtCurrency(c.parcela2.valor)}</span>
                  </td>
                  <td className="py-3 px-3">
                    <Badge className={`text-[10px] border ${situacaoColors[c.situacao] || 'bg-muted/20 text-muted-foreground'}`}>
                      {c.situacao}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-foreground">{fmtCurrency(c.valorTotal)}</td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex gap-1 justify-center">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/30">
            <p className="text-xs text-muted-foreground">Página {page + 1} de {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal — properly centered */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>{editingId !== null ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
            <DialogDescription>Preencha os dados do cliente abaixo.</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input value={form.data} onChange={e => updateFormField('data', e.target.value)} placeholder="DD/MM/YYYY" />
              </div>
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input value={form.nome} onChange={e => updateFormField('nome', e.target.value.toUpperCase())} />
              </div>
              <div className="space-y-2">
                <Label>CPF / CNPJ</Label>
                <Input value={form.cpf} onChange={e => updateFormField('cpf', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Data de Nascimento</Label>
                <Input value={form.nascimento} onChange={e => updateFormField('nascimento', e.target.value)} placeholder="DD/MM/YYYY" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => updateFormField('email', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={e => updateFormField('telefone', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Serviço</Label>
                <Select value={form.servico} onValueChange={v => updateFormField('servico', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LIMPA NOME">Limpa Nome</SelectItem>
                    <SelectItem value="RATING">Rating</SelectItem>
                    <SelectItem value="OUTROS">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vendedor</Label>
                <Select value={form.vendedor} onValueChange={v => updateFormField('vendedor', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {vendedores.map(v => <SelectItem key={v.id} value={v.nome}>{v.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Entrada (R$)</Label>
                <Input type="number" value={form.entrada} onChange={e => updateFormField('entrada', Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Situação</Label>
                <Input value={form.situacao} onChange={e => updateFormField('situacao', e.target.value.toUpperCase())} />
              </div>
              <div className="col-span-full border-t border-border/30 pt-4">
                <p className="text-sm font-medium text-foreground mb-3">Parcelas</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>1ª Parcela (R$)</Label>
                    <Input type="number" value={form.parcela1.valor} onChange={e => setForm(f => ({ ...f, parcela1: { ...f.parcela1, valor: Number(e.target.value) } }))} />
                    <Select value={form.parcela1.status} onValueChange={v => setForm(f => ({ ...f, parcela1: { ...f.parcela1, status: v as any } }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AGUARDANDO">Aguardando</SelectItem>
                        <SelectItem value="PAGO">Pago</SelectItem>
                        <SelectItem value="CANCELADO">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>2ª Parcela (R$)</Label>
                    <Input type="number" value={form.parcela2.valor} onChange={e => setForm(f => ({ ...f, parcela2: { ...f.parcela2, valor: Number(e.target.value) } }))} />
                    <Select value={form.parcela2.status} onValueChange={v => setForm(f => ({ ...f, parcela2: { ...f.parcela2, status: v as any } }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AGUARDANDO">Aguardando</SelectItem>
                        <SelectItem value="PAGO">Pago</SelectItem>
                        <SelectItem value="CANCELADO">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t border-border/30 pt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. O cliente será removido permanentemente e todos os KPIs serão atualizados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

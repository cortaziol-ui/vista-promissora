import { useState, useMemo, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { KpiCard } from '@/components/KpiCard';
import { useSalesData, type Cliente } from '@/contexts/SalesDataContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DollarSign, TrendingUp, TrendingDown, Percent, AlertTriangle, Plus, Pencil, Trash2, CalendarDays } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

const fmtFull = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmt = (v: number) => {
  if (v >= 1000) return `R$ ${Math.round(v / 1000)}k`;
  return `R$ ${Math.round(v)}`;
};

interface Custo {
  id: string;
  nome: string;
  tipo: 'fixo' | 'variavel';
  valor: number;
  mes_referencia: string;
  categoria: string;
}

/** Parse DD/MM/YYYY to Date */
function parseDate(d: string): Date | null {
  if (!d) return null;
  const parts = d.split('/');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

/** Parse DD/MM/YYYY to YYYY-MM */
function toYM(d: string): string | null {
  if (!d) return null;
  const parts = d.split('/');
  if (parts.length !== 3) return null;
  return `${parts[2]}-${parts[1].padStart(2, '0')}`;
}

/** Get month label from YYYY-MM */
function monthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${names[Number(m) - 1]}/${y}`;
}

/** Add months to YYYY-MM */
function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Subtract months from YYYY-MM */
function subMonths(ym: string, n: number): string {
  return addMonths(ym, -n);
}

export default function FinancialPage() {
  const { clientes, filteredClientes, selectedMonth, setSelectedMonth } = useSalesData();
  const { toast } = useToast();

  // Custos state
  const [custos, setCustos] = useState<Custo[]>([]);
  const [custosLoading, setCustosLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCusto, setEditingCusto] = useState<Custo | null>(null);
  const [custoForm, setCustoForm] = useState({ nome: '', tipo: 'fixo' as 'fixo' | 'variavel', valor: 0, categoria: '' });

  // Available months from clientes
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    clientes.forEach(c => {
      const ym = toYM(c.data);
      if (ym) set.add(ym);
    });
    // Add current month and next 3
    const now = new Date();
    const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    for (let i = 0; i <= 3; i++) set.add(addMonths(cur, i));
    return Array.from(set).sort().reverse();
  }, [clientes]);

  // Fetch custos
  const fetchCustos = useCallback(async () => {
    const { data } = await (supabase.from as any)('custos_mensais').select('*').order('created_at');
    if (data) setCustos(data as Custo[]);
    setCustosLoading(false);
  }, []);

  useEffect(() => { fetchCustos(); }, [fetchCustos]);

  // Filter custos by month
  const custosMes = useMemo(() => custos.filter(c => c.mes_referencia === selectedMonth), [custos, selectedMonth]);
  const custosFixos = useMemo(() => custosMes.filter(c => c.tipo === 'fixo').reduce((s, c) => s + c.valor, 0), [custosMes]);
  const custosVariaveis = useMemo(() => custosMes.filter(c => c.tipo === 'variavel').reduce((s, c) => s + c.valor, 0), [custosMes]);
  const custosTotal = custosFixos + custosVariaveis;

  // Helper: get clientes for a given month
  const clientesPorMes = useCallback((ym: string) => {
    return clientes.filter(c => toYM(c.data) === ym);
  }, [clientes]);

  // === RECEITA REALIZADA DO MÊS ===
  const receitaMes = useMemo(() => {
    const mc = filteredClientes;
    const entradas = mc.reduce((s, c) => s + (c.entrada || 0), 0);

    // Parcelas pagas cujo dataPagamento cai no mês selecionado
    let p1Pagas = 0;
    let p2Pagas = 0;
    clientes.forEach(c => {
      if (c.parcela1.status === 'PAGO' && c.parcela1.dataPagamento) {
        const pm = toYM(c.parcela1.dataPagamento);
        if (pm === selectedMonth) p1Pagas += c.parcela1.valor;
      }
      if (c.parcela2.status === 'PAGO' && c.parcela2.dataPagamento) {
        const pm = toYM(c.parcela2.dataPagamento);
        if (pm === selectedMonth) p2Pagas += c.parcela2.valor;
      }
    });

    return { entradas, p1Pagas, p2Pagas, total: entradas + p1Pagas + p2Pagas };
  }, [filteredClientes, clientes, selectedMonth]);

  const lucro = receitaMes.total - custosTotal;
  const margem = receitaMes.total > 0 ? (lucro / receitaMes.total) * 100 : 0;

  // === PROJEÇÃO PARA PRÓXIMOS 3 MESES ===
  const projecao = useMemo(() => {
    const months: { mes: string; entradas: number; p1: number; p2: number; total: number; tipo: 'realizado' | 'projetado' }[] = [];

    // Mês atual (realizado)
    months.push({
      mes: selectedMonth,
      entradas: receitaMes.entradas,
      p1: receitaMes.p1Pagas,
      p2: receitaMes.p2Pagas,
      total: receitaMes.total,
      tipo: 'realizado',
    });

    // Média de entradas dos últimos 3 meses
    let somaEntradas = 0;
    let mesesComDados = 0;
    for (let i = 0; i < 3; i++) {
      const m = subMonths(selectedMonth, i);
      const mc = clientesPorMes(m);
      const ent = mc.reduce((s, c) => s + (c.entrada || 0), 0);
      if (mc.length > 0) { somaEntradas += ent; mesesComDados++; }
    }
    const mediaEntradas = mesesComDados > 0 ? somaEntradas / mesesComDados : 0;

    // Próximos 3 meses
    for (let i = 1; i <= 3; i++) {
      const futureMonth = addMonths(selectedMonth, i);
      const mesP1 = subMonths(futureMonth, 1); // vendas 1 mês antes → parcela 1
      const mesP2 = subMonths(futureMonth, 2); // vendas 2 meses antes → parcela 2

      const p1 = clientesPorMes(mesP1)
        .filter(c => c.parcela1.status === 'AGUARDANDO')
        .reduce((s, c) => s + c.parcela1.valor, 0);

      const p2 = clientesPorMes(mesP2)
        .filter(c => c.parcela2.status === 'AGUARDANDO')
        .reduce((s, c) => s + c.parcela2.valor, 0);

      const entradas = mediaEntradas;
      months.push({ mes: futureMonth, entradas, p1, p2, total: entradas + p1 + p2, tipo: 'projetado' });
    }

    return months;
  }, [selectedMonth, receitaMes, clientesPorMes]);

  // === INADIMPLÊNCIA ===
  const inadimplentes = useMemo(() => {
    const hoje = new Date();
    const result: { cliente: Cliente; parcela: string; valor: number; diasAtraso: number; vencimento: Date }[] = [];

    clientes.forEach(c => {
      const dataVenda = parseDate(c.data);
      if (!dataVenda) return;

      // Parcela 1: vence 30 dias após venda
      if (c.parcela1.status === 'AGUARDANDO' && c.parcela1.valor > 0) {
        const venc = new Date(dataVenda);
        venc.setDate(venc.getDate() + 30);
        if (venc < hoje) {
          const dias = Math.floor((hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
          result.push({ cliente: c, parcela: '1ª Parcela', valor: c.parcela1.valor, diasAtraso: dias, vencimento: venc });
        }
      }

      // Parcela 2: vence 60 dias após venda
      if (c.parcela2.status === 'AGUARDANDO' && c.parcela2.valor > 0) {
        const venc = new Date(dataVenda);
        venc.setDate(venc.getDate() + 60);
        if (venc < hoje) {
          const dias = Math.floor((hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
          result.push({ cliente: c, parcela: '2ª Parcela', valor: c.parcela2.valor, diasAtraso: dias, vencimento: venc });
        }
      }
    });

    return result.sort((a, b) => b.diasAtraso - a.diasAtraso);
  }, [clientes]);

  const totalInadimplente = inadimplentes.reduce((s, i) => s + i.valor, 0);

  // === COMPARATIVO MENSAL (últimos 3 meses) ===
  const comparativo = useMemo(() => {
    const result: { mes: string; receita: number; custos: number; lucro: number }[] = [];
    for (let i = 2; i >= 0; i--) {
      const m = subMonths(selectedMonth, i);
      const mc = clientesPorMes(m);
      const ent = mc.reduce((s, c) => s + (c.entrada || 0), 0);

      let p1 = 0, p2 = 0;
      clientes.forEach(c => {
        if (c.parcela1.status === 'PAGO' && c.parcela1.dataPagamento && toYM(c.parcela1.dataPagamento) === m) p1 += c.parcela1.valor;
        if (c.parcela2.status === 'PAGO' && c.parcela2.dataPagamento && toYM(c.parcela2.dataPagamento) === m) p2 += c.parcela2.valor;
      });

      const receita = ent + p1 + p2;
      const cst = custos.filter(c => c.mes_referencia === m).reduce((s, c) => s + c.valor, 0);
      result.push({ mes: monthLabel(m), receita, custos: cst, lucro: receita - cst });
    }
    return result;
  }, [selectedMonth, clientesPorMes, clientes, custos]);

  // === CUSTOS CRUD ===
  const handleSaveCusto = async () => {
    if (!custoForm.nome.trim() || custoForm.valor <= 0) {
      toast({ title: 'Erro', description: 'Preencha nome e valor.', variant: 'destructive' });
      return;
    }

    if (editingCusto) {
      await (supabase.from as any)('custos_mensais').update({
        nome: custoForm.nome, tipo: custoForm.tipo, valor: custoForm.valor, categoria: custoForm.categoria,
      }).eq('id', editingCusto.id);
      toast({ title: 'Custo atualizado' });
    } else {
      await (supabase.from as any)('custos_mensais').insert({
        nome: custoForm.nome, tipo: custoForm.tipo, valor: custoForm.valor,
        mes_referencia: selectedMonth, categoria: custoForm.categoria,
      });
      toast({ title: 'Custo adicionado' });
    }

    setDialogOpen(false);
    setEditingCusto(null);
    setCustoForm({ nome: '', tipo: 'fixo', valor: 0, categoria: '' });
    fetchCustos();
  };

  const handleDeleteCusto = async (id: string) => {
    await (supabase.from as any)('custos_mensais').delete().eq('id', id);
    toast({ title: 'Custo excluído' });
    fetchCustos();
  };

  const openEditCusto = (c: Custo) => {
    setEditingCusto(c);
    setCustoForm({ nome: c.nome, tipo: c.tipo, valor: c.valor, categoria: c.categoria });
    setDialogOpen(true);
  };

  const openNewCusto = () => {
    setEditingCusto(null);
    setCustoForm({ nome: '', tipo: 'fixo', valor: 0, categoria: '' });
    setDialogOpen(true);
  };

  // === RENDER ===
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground text-sm">Receitas, custos e projeção — {monthLabel(selectedMonth)}</p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[160px] bg-secondary border-border/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              {availableMonths.map(m => <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Receita Realizada" value={fmtFull(receitaMes.total)} icon={<DollarSign className="w-5 h-5 text-kpi-revenue" />} glowClass="kpi-glow-revenue" colorClass="bg-kpi-revenue/15" />
        <KpiCard title="Custos Totais" value={fmtFull(custosTotal)} icon={<TrendingDown className="w-5 h-5 text-red-400" />} glowClass="" colorClass="bg-red-500/15" />
        <KpiCard title="Lucro Operacional" value={fmtFull(lucro)} icon={<TrendingUp className="w-5 h-5 text-kpi-success" />} glowClass="kpi-glow-ticket" colorClass="bg-kpi-success/15" subtitle={lucro >= 0 ? '' : 'Prejuízo'} />
        <KpiCard title="Margem de Lucro" value={`${margem.toFixed(1)}%`} icon={<Percent className="w-5 h-5 text-kpi-goal-pct" />} glowClass="kpi-glow-pct" colorClass="bg-kpi-goal-pct/15" />
      </div>

      {/* Detalhamento de Receita */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Detalhamento de Receita — {monthLabel(selectedMonth)}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-secondary/50 text-center">
            <p className="text-xs text-muted-foreground">Entradas</p>
            <p className="text-lg font-bold text-foreground">{fmtFull(receitaMes.entradas)}</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/50 text-center">
            <p className="text-xs text-muted-foreground">1ª Parcelas Recebidas</p>
            <p className="text-lg font-bold text-foreground">{fmtFull(receitaMes.p1Pagas)}</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/50 text-center">
            <p className="text-xs text-muted-foreground">2ª Parcelas Recebidas</p>
            <p className="text-lg font-bold text-foreground">{fmtFull(receitaMes.p2Pagas)}</p>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-center">
            <p className="text-xs text-primary">Total Realizado</p>
            <p className="text-lg font-bold text-primary">{fmtFull(receitaMes.total)}</p>
          </div>
        </div>
      </div>

      {/* Projeção de Receita */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Projeção de Receita — Próximos 3 Meses</h3>
        <div className="h-64 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projecao.map(p => ({ mes: monthLabel(p.mes), Entradas: Math.round(p.entradas), 'Parcela 1': Math.round(p.p1), 'Parcela 2': Math.round(p.p2) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
              <XAxis dataKey="mes" stroke="hsl(215, 20%, 65%)" fontSize={12} />
              <YAxis stroke="hsl(215, 20%, 65%)" fontSize={11} tickFormatter={fmt} width={70} />
              <Tooltip contentStyle={{ background: 'hsl(220, 39%, 10%)', border: '1px solid hsl(220, 20%, 18%)', borderRadius: '8px', color: '#f1f5f9' }} formatter={(v: number) => fmtFull(v)} />
              <Legend />
              <Bar dataKey="Entradas" stackId="a" fill="hsl(217, 91%, 60%)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Parcela 1" stackId="a" fill="hsl(160, 84%, 39%)" />
              <Bar dataKey="Parcela 2" stackId="a" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-border/50">
                <th className="text-left py-2 px-2">Mês</th>
                <th className="text-right py-2 px-2">Entradas</th>
                <th className="text-right py-2 px-2">1ª Parcelas</th>
                <th className="text-right py-2 px-2">2ª Parcelas</th>
                <th className="text-right py-2 px-2">Total</th>
                <th className="text-center py-2 px-2">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {projecao.map(p => (
                <tr key={p.mes} className="border-b border-border/30">
                  <td className="py-2 px-2 font-medium">{monthLabel(p.mes)}</td>
                  <td className="py-2 px-2 text-right">{fmtFull(p.entradas)}</td>
                  <td className="py-2 px-2 text-right">{fmtFull(p.p1)}</td>
                  <td className="py-2 px-2 text-right">{fmtFull(p.p2)}</td>
                  <td className="py-2 px-2 text-right font-semibold">{fmtFull(p.total)}</td>
                  <td className="py-2 px-2 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.tipo === 'realizado' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {p.tipo === 'realizado' ? 'Realizado' : 'Projetado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inadimplência */}
      {inadimplentes.length > 0 && (
        <div className="glass-card p-5 border border-red-500/30">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h3 className="text-sm font-semibold text-red-400">Parcelas Vencidas — {fmtFull(totalInadimplente)} em atraso</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border/50">
                  <th className="text-left py-2 px-2">Cliente</th>
                  <th className="text-left py-2 px-2">Vendedor</th>
                  <th className="text-left py-2 px-2">Parcela</th>
                  <th className="text-right py-2 px-2">Valor</th>
                  <th className="text-right py-2 px-2">Dias em Atraso</th>
                </tr>
              </thead>
              <tbody>
                {inadimplentes.slice(0, 20).map((item, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-2 px-2 font-medium">{item.cliente.nome}</td>
                    <td className="py-2 px-2 text-muted-foreground">{item.cliente.vendedor}</td>
                    <td className="py-2 px-2">{item.parcela}</td>
                    <td className="py-2 px-2 text-right text-red-400 font-medium">{fmtFull(item.valor)}</td>
                    <td className="py-2 px-2 text-right">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">{item.diasAtraso} dias</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Custos do Mês */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Custos — {monthLabel(selectedMonth)}</h3>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openNewCusto}><Plus className="w-4 h-4 mr-2" />Adicionar Custo</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>{editingCusto ? 'Editar Custo' : 'Novo Custo'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">Nome</label>
                  <Input value={custoForm.nome} onChange={e => setCustoForm({ ...custoForm, nome: e.target.value })} className="bg-secondary border-border/50 mt-1" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Tipo</label>
                  <Select value={custoForm.tipo} onValueChange={(v: 'fixo' | 'variavel') => setCustoForm({ ...custoForm, tipo: v })}>
                    <SelectTrigger className="bg-secondary border-border/50 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixo">Fixo</SelectItem>
                      <SelectItem value="variavel">Variável</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Valor (R$)</label>
                  <Input type="number" value={custoForm.valor} onChange={e => setCustoForm({ ...custoForm, valor: Number(e.target.value) })} className="bg-secondary border-border/50 mt-1" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Categoria (opcional)</label>
                  <Input value={custoForm.categoria} onChange={e => setCustoForm({ ...custoForm, categoria: e.target.value })} placeholder="Ex: infraestrutura, marketing..." className="bg-secondary border-border/50 mt-1" />
                </div>
                <Button onClick={handleSaveCusto} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {custosMes.length === 0 && !custosLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum custo cadastrado para este mês.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border/50">
                  <th className="text-left py-2 px-2">Nome</th>
                  <th className="text-left py-2 px-2">Tipo</th>
                  <th className="text-left py-2 px-2">Categoria</th>
                  <th className="text-right py-2 px-2">Valor</th>
                  <th className="text-center py-2 px-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {custosMes.map(c => (
                  <tr key={c.id} className="border-b border-border/30">
                    <td className="py-2 px-2 font-medium">{c.nome}</td>
                    <td className="py-2 px-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.tipo === 'fixo' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {c.tipo === 'fixo' ? 'Fixo' : 'Variável'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-muted-foreground">{c.categoria || '—'}</td>
                    <td className="py-2 px-2 text-right font-medium">{fmtFull(c.valor)}</td>
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditCusto(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteCusto(c.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border/50">
                  <td colSpan={3} className="py-2 px-2 text-muted-foreground">Custos Fixos</td>
                  <td className="py-2 px-2 text-right font-medium">{fmtFull(custosFixos)}</td>
                  <td />
                </tr>
                <tr>
                  <td colSpan={3} className="py-2 px-2 text-muted-foreground">Custos Variáveis</td>
                  <td className="py-2 px-2 text-right font-medium">{fmtFull(custosVariaveis)}</td>
                  <td />
                </tr>
                <tr className="border-t border-border/50 font-semibold">
                  <td colSpan={3} className="py-2 px-2">Total</td>
                  <td className="py-2 px-2 text-right">{fmtFull(custosTotal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Comparativo Mensal */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Comparativo Mensal</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparativo}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
              <XAxis dataKey="mes" stroke="hsl(215, 20%, 65%)" fontSize={12} />
              <YAxis stroke="hsl(215, 20%, 65%)" fontSize={11} tickFormatter={fmt} width={70} />
              <Tooltip contentStyle={{ background: 'hsl(220, 39%, 10%)', border: '1px solid hsl(220, 20%, 18%)', borderRadius: '8px', color: '#f1f5f9' }} formatter={(v: number) => fmtFull(v)} />
              <Legend />
              <Bar dataKey="receita" name="Receita" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="custos" name="Custos" fill="hsl(0, 70%, 55%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lucro" name="Lucro" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

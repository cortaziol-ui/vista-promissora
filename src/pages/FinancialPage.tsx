import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { KpiCard } from '@/components/KpiCard';
import { useSalesData } from '@/contexts/SalesDataContext';
import { DollarSign, TrendingUp, BarChart3, ArrowUpDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const fmtFull = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmt = (v: number) => `R$ ${(v / 1000).toFixed(1)}k`;

export default function FinancialPage() {
  const { faturamento, projecao, vendedorStats, vendedores, clientes } = useSalesData();
  const [filterVendedor, setFilterVendedor] = useState('all');

  const filteredFat = useMemo(() => {
    if (filterVendedor === 'all') return faturamento;
    return clientes.filter(c => c.vendedor === filterVendedor).reduce((s, c) => s + (c.entrada || 0), 0);
  }, [clientes, filterVendedor, faturamento]);

  const filteredStats = useMemo(() => {
    if (filterVendedor === 'all') return vendedorStats;
    return vendedorStats.filter(s => s.vendedor.nome === filterVendedor);
  }, [vendedorStats, filterVendedor]);

  const sellerRevChart = useMemo(() =>
    filteredStats.map(s => ({ name: s.vendedor.nome, value: s.faturamento })),
  [filteredStats]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Financeiro</h1>
          <p className="text-muted-foreground text-sm">Análise financeira — Março/2026</p>
        </div>
        <Select value={filterVendedor} onValueChange={setFilterVendedor}>
          <SelectTrigger className="w-[180px] bg-secondary border-border/50"><SelectValue placeholder="Todos vendedores" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos vendedores</SelectItem>
            {vendedores.map(v => <SelectItem key={v.id} value={v.nome}>{v.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Faturamento Mensal" value={fmtFull(filteredFat)} icon={<DollarSign className="w-5 h-5 text-kpi-revenue" />} glowClass="kpi-glow-revenue" colorClass="bg-kpi-revenue/15" />
        <KpiCard title="Projeção" value={fmtFull(projecao)} icon={<BarChart3 className="w-5 h-5 text-kpi-projection" />} glowClass="kpi-glow-projection" colorClass="bg-kpi-projection/15" />
        <KpiCard title="Vendedores Ativos" value={String(vendedores.length)} icon={<TrendingUp className="w-5 h-5 text-kpi-ticket" />} glowClass="kpi-glow-ticket" colorClass="bg-kpi-ticket/15" />
        <KpiCard title="Ticket Médio Geral" value={fmtFull(filteredFat / Math.max(1, clientes.filter(c => filterVendedor === 'all' || c.vendedor === filterVendedor).length))} icon={<ArrowUpDown className="w-5 h-5 text-kpi-goal-pct" />} glowClass="kpi-glow-pct" colorClass="bg-kpi-goal-pct/15" />
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Faturamento por Vendedor</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sellerRevChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
              <XAxis dataKey="name" stroke="hsl(215, 20%, 65%)" fontSize={12} />
              <YAxis stroke="hsl(215, 20%, 65%)" fontSize={12} tickFormatter={fmt} />
              <Tooltip contentStyle={{ background: 'hsl(220, 39%, 10%)', border: '1px solid hsl(220, 20%, 18%)', borderRadius: '8px', color: '#f1f5f9' }} formatter={(v: number) => [fmtFull(v), 'Faturamento']} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="hsl(199, 89%, 60%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { KpiCard } from '@/components/KpiCard';
import { ProgressBar } from '@/components/ProgressBar';
import { useSalesData } from '@/contexts/SalesDataContext';
import { DollarSign, Target, Receipt, ShoppingCart, TrendingUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const fmtFull = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmt = (v: number) => `R$ ${(v / 1000).toFixed(1)}k`;

export default function SalesPage() {
  const { clientes, vendedores, vendedorStats, metaMensalGlobal } = useSalesData();
  const [filterVendedor, setFilterVendedor] = useState('all');

  const filteredClientes = useMemo(() => {
    if (filterVendedor === 'all') return clientes;
    return clientes.filter(c => c.vendedor === filterVendedor);
  }, [clientes, filterVendedor]);

  const filteredStats = useMemo(() => {
    if (filterVendedor === 'all') return vendedorStats;
    return vendedorStats.filter(s => s.vendedor.nome === filterVendedor);
  }, [vendedorStats, filterVendedor]);

  const faturamento = useMemo(() => filteredClientes.reduce((s, c) => s + (c.entrada || 0), 0), [filteredClientes]);
  const totalVendas = filteredClientes.length;
  const ticketMedio = totalVendas > 0 ? faturamento / totalVendas : 0;
  const pctMeta = (faturamento / metaMensalGlobal) * 100;

  const dailySales = useMemo(() => {
    const byDay: Record<string, number> = {};
    filteredClientes.forEach(c => {
      const day = c.data.split('/')[0];
      byDay[day] = (byDay[day] || 0) + (c.entrada || 0);
    });
    return Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([day, value]) => ({ day, value }));
  }, [filteredClientes]);

  const ticketByDay = useMemo(() => {
    const byDay: Record<string, { total: number; count: number }> = {};
    filteredClientes.forEach(c => {
      const day = c.data.split('/')[0];
      if (!byDay[day]) byDay[day] = { total: 0, count: 0 };
      byDay[day].total += (c.entrada || 0);
      byDay[day].count++;
    });
    return Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([day, d]) => ({ day, ticket: d.count > 0 ? d.total / d.count : 0 }));
  }, [filteredClientes]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard de Vendas</h1>
          <p className="text-muted-foreground text-sm">Análise detalhada de performance — Março/2026</p>
        </div>
        <Select value={filterVendedor} onValueChange={setFilterVendedor}>
          <SelectTrigger className="w-[180px] bg-secondary border-border/50"><SelectValue placeholder="Todos vendedores" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos vendedores</SelectItem>
            {vendedores.map(v => <SelectItem key={v.id} value={v.nome}>{v.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard title="Faturamento" value={fmtFull(faturamento)} icon={<DollarSign className="w-5 h-5 text-kpi-revenue" />} glowClass="kpi-glow-revenue" colorClass="bg-kpi-revenue/15" />
        <KpiCard title="Meta Mensal" value={fmtFull(metaMensalGlobal)} icon={<Target className="w-5 h-5 text-kpi-goal" />} glowClass="kpi-glow-goal" colorClass="bg-kpi-goal/15" />
        <KpiCard title="% da Meta" value={`${pctMeta.toFixed(1)}%`} subtitle={`Faltam ${fmtFull(Math.max(0, metaMensalGlobal - faturamento))}`} icon={<TrendingUp className="w-5 h-5 text-kpi-goal-pct" />} glowClass="kpi-glow-pct" colorClass="bg-kpi-goal-pct/15" />
        <KpiCard title="Ticket Médio" value={fmtFull(ticketMedio)} icon={<Receipt className="w-5 h-5 text-kpi-ticket" />} glowClass="kpi-glow-ticket" colorClass="bg-kpi-ticket/15" />
        <KpiCard title="Total Vendas" value={String(totalVendas)} icon={<ShoppingCart className="w-5 h-5 text-kpi-sales" />} glowClass="kpi-glow-sales" colorClass="bg-kpi-sales/15" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Evolução Diária</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailySales}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(255, 62%, 68%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                <XAxis dataKey="day" stroke="hsl(215, 20%, 65%)" fontSize={12} />
                <YAxis stroke="hsl(215, 20%, 65%)" fontSize={12} tickFormatter={fmt} />
                <Tooltip contentStyle={{ background: 'hsl(220, 39%, 10%)', border: '1px solid hsl(220, 20%, 18%)', borderRadius: '8px', color: '#f1f5f9' }} formatter={(v: number) => [fmtFull(v), 'Vendas']} />
                <Area type="monotone" dataKey="value" stroke="hsl(217, 91%, 60%)" fill="url(#salesGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Ticket Médio por Dia</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ticketByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                <XAxis dataKey="day" stroke="hsl(215, 20%, 65%)" fontSize={12} />
                <YAxis stroke="hsl(215, 20%, 65%)" fontSize={12} tickFormatter={fmt} />
                <Tooltip contentStyle={{ background: 'hsl(220, 39%, 10%)', border: '1px solid hsl(220, 20%, 18%)', borderRadius: '8px', color: '#f1f5f9' }} formatter={(v: number) => [fmtFull(v), 'Ticket']} />
                <Bar dataKey="ticket" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Seller Detail Table */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Performance por Vendedor</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-border/50">
                <th className="text-left py-3 px-2">#</th>
                <th className="text-left py-3 px-2">Vendedor</th>
                <th className="text-right py-3 px-2">Meta</th>
                <th className="text-right py-3 px-2">Faturamento</th>
                <th className="text-right py-3 px-2">Faltam</th>
                <th className="text-right py-3 px-2">Vendas</th>
                <th className="text-right py-3 px-2">Ticket Médio</th>
                <th className="text-left py-3 px-2 min-w-[140px]">% Meta</th>
              </tr>
            </thead>
            <tbody>
              {filteredStats.map((stat, i) => (
                <tr key={stat.vendedor.id} className="border-b border-border/30 hover:bg-secondary/50 transition-colors">
                  <td className={`py-3 px-2 font-bold ${i < 3 ? ['text-medal-gold', 'text-medal-silver', 'text-medal-bronze'][i] : 'text-muted-foreground'}`}>
                    {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{stat.vendedor.avatar}</span>
                      <div>
                        <p className="font-medium text-foreground">{stat.vendedor.nome}</p>
                        <p className="text-xs text-muted-foreground">{stat.vendedor.cargo}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right text-kpi-goal font-medium">{fmtFull(stat.vendedor.meta)}</td>
                  <td className="py-3 px-2 text-right font-semibold text-foreground">{fmtFull(stat.faturamento)}</td>
                  <td className="py-3 px-2 text-right text-muted-foreground">{fmtFull(stat.faltam)}</td>
                  <td className="py-3 px-2 text-right text-muted-foreground">{stat.vendas}</td>
                  <td className="py-3 px-2 text-right text-muted-foreground">{fmtFull(stat.ticketMedio)}</td>
                  <td className="py-3 px-2"><ProgressBar value={stat.pctMeta} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

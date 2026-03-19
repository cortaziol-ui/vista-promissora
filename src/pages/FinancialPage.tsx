import { useState, useMemo } from 'react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { KpiCard } from '@/components/KpiCard';
import { FilterBar } from '@/components/FilterBar';
import { useAuth } from '@/contexts/AuthContext';
import { sales, getAllSellerStats, getMonthlyTotals } from '@/data/mockData';
import { DollarSign, TrendingUp, BarChart3, ArrowUpDown } from 'lucide-react';

const fmtFull = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmt = (v: number) => `R$ ${(v / 1000).toFixed(1)}k`;

export default function FinancialPage() {
  const now = new Date();
  const { user, isSeller } = useAuth();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [seller, setSeller] = useState('all');

  const totals = useMemo(() => getMonthlyTotals(year, month), [year, month]);

  // Monthly comparison - last 3 months
  const monthlyComparison = useMemo(() => {
    const result = [];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    for (let i = 2; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const prefix = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
      let filtered = sales.filter(s => s.date.startsWith(prefix));
      if (isSeller && user) filtered = filtered.filter(s => s.userId === user.id);
      else if (seller !== 'all') filtered = filtered.filter(s => s.userId === seller);
      const revenue = filtered.reduce((s, sale) => s + sale.value, 0);
      result.push({ month: months[m.getMonth()], revenue });
    }
    return result;
  }, [seller, isSeller, user]);

  const growth = monthlyComparison.length >= 2 && monthlyComparison[monthlyComparison.length - 2].revenue > 0
    ? ((monthlyComparison[monthlyComparison.length - 1].revenue - monthlyComparison[monthlyComparison.length - 2].revenue) / monthlyComparison[monthlyComparison.length - 2].revenue) * 100
    : 0;

  const sellerRevenue = useMemo(() => {
    const stats = getAllSellerStats(year, month);
    if (isSeller && user) return stats.filter(s => s.user.id === user.id);
    if (seller !== 'all') return stats.filter(s => s.user.id === seller);
    return stats;
  }, [year, month, seller, isSeller, user]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Financeiro</h1>
          <p className="text-muted-foreground text-sm">Análise financeira e projeções</p>
        </div>
        <FilterBar selectedYear={year} selectedMonth={month} selectedSeller={seller} onYearChange={setYear} onMonthChange={setMonth} onSellerChange={setSeller} showSellerFilter={!isSeller} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Faturamento Mensal" value={fmtFull(totals.totalRevenue)} change={totals.revenueChange} icon={<DollarSign className="w-5 h-5 text-kpi-revenue" />} glowClass="kpi-glow-revenue" colorClass="bg-kpi-revenue/15" />
        <KpiCard title="Crescimento" value={`${growth.toFixed(1)}%`} icon={<TrendingUp className="w-5 h-5 text-kpi-ticket" />} glowClass="kpi-glow-ticket" colorClass="bg-kpi-ticket/15" />
        <KpiCard title="Projeção" value={fmtFull(totals.projection)} icon={<BarChart3 className="w-5 h-5 text-kpi-projection" />} glowClass="kpi-glow-projection" colorClass="bg-kpi-projection/15" />
        <KpiCard title="Variação" value={`${totals.revenueChange >= 0 ? '+' : ''}${totals.revenueChange.toFixed(1)}%`} icon={<ArrowUpDown className="w-5 h-5 text-kpi-goal-pct" />} glowClass="kpi-glow-pct" colorClass="bg-kpi-goal-pct/15" subtitle="vs mês anterior" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Comparação Mensal</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                <XAxis dataKey="month" stroke="hsl(215, 20%, 65%)" fontSize={12} />
                <YAxis stroke="hsl(215, 20%, 65%)" fontSize={12} tickFormatter={fmt} />
                <Tooltip contentStyle={{ background: 'hsl(220, 39%, 10%)', border: '1px solid hsl(220, 20%, 18%)', borderRadius: '8px', color: '#f1f5f9' }} formatter={(v: number) => [fmtFull(v), 'Receita']} />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]} fill="hsl(255, 62%, 68%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Faturamento por Vendedor</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sellerRevenue.map(s => ({ name: s.user.name.split(' ')[0], value: s.totalRevenue }))}>
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
    </div>
  );
}

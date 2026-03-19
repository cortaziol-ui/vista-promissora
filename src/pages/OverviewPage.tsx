import { useMemo } from 'react';
import { DollarSign, Target, TrendingUp, Receipt, ShoppingCart, BarChart3, Trophy } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { KpiCard } from '@/components/KpiCard';
import { ProgressBar } from '@/components/ProgressBar';
import { useSalesData } from '@/contexts/SalesDataContext';

const fmtFull = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmt = (v: number) => `R$ ${(v / 1000).toFixed(1)}k`;

export default function OverviewPage() {
  const { faturamento, totalVendas, ticketMedio, pctMeta, projecao, metaMensalGlobal, vendedorStats, dailyEvolution } = useSalesData();

  const sellerChart = useMemo(() =>
    vendedorStats.map(s => ({ name: s.vendedor.nome, value: s.faturamento })),
  [vendedorStats]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Visão Geral de Performance</h1>
        <p className="text-muted-foreground text-sm">Acompanhe os resultados em tempo real — Março/2026</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard title="Faturamento" value={fmtFull(faturamento)} icon={<DollarSign className="w-5 h-5 text-kpi-revenue" />} glowClass="kpi-glow-revenue" colorClass="bg-kpi-revenue/15" delay={0} />
        <KpiCard title="Meta Mensal" value={fmtFull(metaMensalGlobal)} icon={<Target className="w-5 h-5 text-kpi-goal" />} glowClass="kpi-glow-goal" colorClass="bg-kpi-goal/15" delay={50} />
        <KpiCard title="% da Meta" value={`${pctMeta.toFixed(1)}%`} icon={<TrendingUp className="w-5 h-5 text-kpi-goal-pct" />} glowClass="kpi-glow-pct" colorClass="bg-kpi-goal-pct/15" delay={100} subtitle={`Faltam ${fmtFull(Math.max(0, metaMensalGlobal - faturamento))}`} />
        <KpiCard title="Ticket Médio" value={fmtFull(ticketMedio)} icon={<Receipt className="w-5 h-5 text-kpi-ticket" />} glowClass="kpi-glow-ticket" colorClass="bg-kpi-ticket/15" delay={150} />
        <KpiCard title="Total Vendas" value={String(totalVendas)} icon={<ShoppingCart className="w-5 h-5 text-kpi-sales" />} glowClass="kpi-glow-sales" colorClass="bg-kpi-sales/15" delay={200} />
        <KpiCard title="Projeção" value={fmtFull(projecao)} icon={<BarChart3 className="w-5 h-5 text-kpi-projection" />} glowClass="kpi-glow-projection" colorClass="bg-kpi-projection/15" delay={250} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5 animate-in" style={{ animationDelay: '300ms' }}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Evolução de Vendas (Diária)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyEvolution}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(255, 62%, 68%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                <XAxis dataKey="dia" stroke="hsl(215, 20%, 65%)" fontSize={12} />
                <YAxis stroke="hsl(215, 20%, 65%)" fontSize={12} tickFormatter={fmt} />
                <Tooltip contentStyle={{ background: 'hsl(220, 39%, 10%)', border: '1px solid hsl(220, 20%, 18%)', borderRadius: '8px', color: 'hsl(210, 40%, 98%)' }} formatter={(value: number) => [fmtFull(value), 'Faturamento']} />
                <Area type="monotone" dataKey="faturamento" stroke="hsl(217, 91%, 60%)" fill="url(#colorRevenue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-5 animate-in" style={{ animationDelay: '350ms' }}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Vendas por Vendedor</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sellerChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                <XAxis dataKey="name" stroke="hsl(215, 20%, 65%)" fontSize={12} />
                <YAxis stroke="hsl(215, 20%, 65%)" fontSize={12} tickFormatter={fmt} />
                <Tooltip contentStyle={{ background: 'hsl(220, 39%, 10%)', border: '1px solid hsl(220, 20%, 18%)', borderRadius: '8px', color: 'hsl(210, 40%, 98%)' }} formatter={(value: number) => [fmtFull(value), 'Faturamento']} />
                <Bar dataKey="value" fill="hsl(199, 89%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Seller Ranking */}
      <div className="glass-card p-5 animate-in" style={{ animationDelay: '400ms' }}>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-medal-gold" />
          <h3 className="text-sm font-semibold text-foreground">Ranking de Vendedores</h3>
        </div>
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
              {vendedorStats.map((stat, i) => {
                const medalColor = i === 0 ? 'text-medal-gold' : i === 1 ? 'text-medal-silver' : i === 2 ? 'text-medal-bronze' : 'text-muted-foreground';
                return (
                  <tr key={stat.vendedor.id} className="border-b border-border/30 hover:bg-secondary/50 transition-colors">
                    <td className={`py-3 px-2 font-bold ${medalColor}`}>
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

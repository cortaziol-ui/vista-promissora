import { useMemo, useState, useEffect } from 'react';
import { DollarSign, Target, TrendingUp, Receipt, ShoppingCart, BarChart3, Trophy, CalendarDays, CheckCircle2, XCircle, Users, MousePointerClick, Megaphone, AlertCircle } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { VendorAvatar } from '@/components/VendorAvatar';
import { KpiCard } from '@/components/KpiCard';
import { ProgressBar } from '@/components/ProgressBar';
import { CommissionProgress } from '@/components/CommissionProgress';
import { useSalesData } from '@/contexts/SalesDataContext';
import { useMonthlyData } from '@/hooks/useMonthlyData';
import { useAvailableMonths } from '@/hooks/useAvailableMonths';
import { getCurrentMonth, monthLabel } from '@/lib/dateUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountContext } from '@/contexts/AccountContext';
import { fetchCampaignInsights, type MetaInsights } from '@/lib/metaAdsApi';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const fmtFull = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtNum = (v: number) => new Intl.NumberFormat('pt-BR').format(v);
const fmt = (v: number) => `R$ ${(v / 1000).toFixed(1)}k`;

export default function OverviewPage() {
  const { clientes } = useSalesData();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const {
    faturamento,
    totalVendas,
    ticketMedio,
    pctMeta,
    projecao,
    metaEmpresaVendas,
    vendedorStats,
    dailyEvolution,
    vendorGoals: monthlyVendorGoals,
  } = useMonthlyData(selectedMonth);

  const availableMonths = useAvailableMonths(clientes);
  const { isSeller } = useAuth();
  const { activeAccount } = useAccountContext();

  // Meta Ads state
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [metaInsights, setMetaInsights] = useState<MetaInsights | null>(null);
  const [metaConnected, setMetaConnected] = useState(false);

  // Load Meta token
  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'meta_access_token').maybeSingle()
      .then(({ data }) => { if (data?.value) setAccessToken(data.value); });
  }, []);

  useEffect(() => {
    if (!accessToken || !activeAccount?.ad_account_id) {
      setMetaConnected(false);
      return;
    }
    setMetaConnected(true);
    let cancelled = false;

    async function sync() {
      try {
        const [selYear, selMonthStr] = selectedMonth.split('-');
        const lastDay = new Date(Number(selYear), Number(selMonthStr), 0).getDate();
        const since = `${selYear}-${selMonthStr}-01`;
        const until = `${selYear}-${selMonthStr}-${String(lastDay).padStart(2, '0')}`;
        const result = await fetchCampaignInsights(accessToken!, activeAccount!.ad_account_id, { since, until });
        if (!cancelled) {
          if (!result.error) {
            setMetaInsights(result.insights);
          } else {
            setMetaInsights(null);
          }
        }
      } catch {
        if (!cancelled) setMetaInsights(null);
      }
    }

    sync();
    return () => { cancelled = true; };
  }, [selectedMonth, accessToken, activeAccount]);

  const sellerChart = useMemo(() =>
    vendedorStats.map(s => ({ name: s.vendedor.nome, value: s.vendas })),
  [vendedorStats]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visão Geral de Performance</h1>
          <p className="text-muted-foreground text-sm">Acompanhe os resultados em tempo real — {monthLabel(selectedMonth)}</p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[160px] bg-secondary border-border/50">
            <CalendarDays className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Selecionar mês" />
          </SelectTrigger>
          <SelectContent>
            {availableMonths.map(m => (
              <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${isSeller ? 'xl:grid-cols-4' : 'xl:grid-cols-6'} gap-4`}>
        <KpiCard title="Meta Mensal" value={`${metaEmpresaVendas} vendas`} icon={<Target className="w-5 h-5 text-kpi-goal" />} glowClass="kpi-glow-goal" colorClass="bg-kpi-goal/15" delay={0} />
        <KpiCard title="% da Meta" value={`${pctMeta.toFixed(1)}%`} subtitle={`Faltam ${Math.max(0, metaEmpresaVendas - totalVendas)} vendas`} icon={<TrendingUp className="w-5 h-5 text-kpi-goal-pct" />} glowClass="kpi-glow-pct" colorClass="bg-kpi-goal-pct/15" delay={50} />
        <KpiCard title="Total Vendas" value={String(totalVendas)} icon={<ShoppingCart className="w-5 h-5 text-kpi-sales" />} glowClass="kpi-glow-sales" colorClass="bg-kpi-sales/15" delay={100} />
        <KpiCard title="Projeção" value={`${Math.round(projecao)} vendas`} icon={<BarChart3 className="w-5 h-5 text-kpi-projection" />} glowClass="kpi-glow-projection" colorClass="bg-kpi-projection/15" delay={150} />
        {!isSeller && (
          <KpiCard title="Faturamento" value={fmtFull(faturamento)} icon={<DollarSign className="w-5 h-5 text-kpi-revenue" />} glowClass="kpi-glow-revenue" colorClass="bg-kpi-revenue/15" delay={200} />
        )}
        {!isSeller && (
          <KpiCard title="Ticket Médio" value={fmtFull(ticketMedio)} icon={<Receipt className="w-5 h-5 text-kpi-ticket" />} glowClass="kpi-glow-ticket" colorClass="bg-kpi-ticket/15" delay={250} />
        )}
      </div>

      {/* Meta Ads key metrics — above charts */}
      {metaConnected ? (
        <div className="glass-card p-5 animate-in" style={{ animationDelay: '280ms' }}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Meta Ads — Resumo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <KpiCard title="Investimento" value={fmtFull(metaInsights?.spend ?? 0)} icon={<Megaphone className="w-5 h-5 text-kpi-goal" />} glowClass="kpi-glow-goal" colorClass="bg-kpi-goal/15" />
            <KpiCard title="Leads" value={fmtNum(metaInsights?.leads ?? 0)} icon={<TrendingUp className="w-5 h-5 text-kpi-projection" />} glowClass="kpi-glow-projection" colorClass="bg-kpi-projection/15" />
            <KpiCard title="CAC" value={totalVendas > 0 ? fmtFull((metaInsights?.spend ?? 0) / totalVendas) : '—'} subtitle="Custo por cliente" icon={<DollarSign className="w-5 h-5 text-kpi-revenue" />} glowClass="kpi-glow-revenue" colorClass="bg-kpi-revenue/15" />
            <KpiCard title="Conversão" value={`${(metaInsights?.leads ?? 0) > 0 ? ((totalVendas / (metaInsights?.leads ?? 1)) * 100).toFixed(1) : '0.0'}%`} subtitle="Vendas / Leads" icon={<Target className="w-5 h-5 text-kpi-ticket" />} glowClass="kpi-glow-ticket" colorClass="bg-kpi-ticket/15" />
            <KpiCard title="Impressões" value={fmtNum(metaInsights?.impressions ?? 0)} icon={<Users className="w-5 h-5 text-kpi-sales" />} glowClass="kpi-glow-sales" colorClass="bg-kpi-sales/15" />
            <KpiCard title="CPL" value={(metaInsights?.leads ?? 0) > 0 ? fmtFull((metaInsights?.spend ?? 0) / (metaInsights?.leads ?? 1)) : '—'} icon={<DollarSign className="w-5 h-5 text-kpi-goal-pct" />} glowClass="kpi-glow-pct" colorClass="bg-kpi-goal-pct/15" />
          </div>
        </div>
      ) : (
        <div className="glass-card p-5 animate-in" style={{ animationDelay: '280ms' }}>
          <div className="flex items-center gap-3 text-muted-foreground">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">Meta Ads não conectado — configure na página de Configurações para visualizar métricas.</p>
          </div>
        </div>
      )}

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
                <YAxis stroke="hsl(215, 20%, 65%)" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'hsl(220, 39%, 10%)', border: '1px solid hsl(220, 20%, 18%)', borderRadius: '8px', color: 'hsl(210, 40%, 98%)' }} formatter={(value: number) => [value, 'Vendas']} />
                <Area type="monotone" dataKey="vendas" stroke="hsl(217, 91%, 60%)" fill="url(#colorRevenue)" strokeWidth={2} />
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
                <YAxis stroke="hsl(215, 20%, 65%)" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'hsl(220, 39%, 10%)', border: '1px solid hsl(220, 20%, 18%)', borderRadius: '8px', color: 'hsl(210, 40%, 98%)' }} formatter={(value: number) => [value, 'Vendas']} />
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
                <th className="text-right py-3 px-2">Vendas</th>
                <th className="text-right py-3 px-2">Faltam</th>
                <th className="text-center py-3 px-2">Projeção</th>
                {!isSeller && <th className="text-right py-3 px-2">Faturamento</th>}
                {!isSeller && <th className="text-right py-3 px-2">Ticket Médio</th>}
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
                        <VendorAvatar foto={stat.vendedor.foto} avatar={stat.vendedor.avatar} size="lg" />
                        <div>
                          <p className="font-medium text-foreground">{stat.vendedor.nome}</p>
                          <p className="text-xs text-muted-foreground">{stat.vendedor.cargo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right text-kpi-goal font-medium">{monthlyVendorGoals.get(stat.vendedor.id) ?? stat.vendedor.meta} vendas</td>
                    <td className="py-3 px-2 text-right font-semibold text-foreground">{stat.vendas}</td>
                    <td className="py-3 px-2 text-right text-muted-foreground">{stat.faltam} vendas</td>
                    <td className="py-3 px-2 text-center">
                      {stat.dentroProjecao
                        ? <CheckCircle2 className="w-5 h-5 text-green-500 inline-block" />
                        : <XCircle className="w-5 h-5 text-red-500 inline-block" />
                      }
                    </td>
                    {!isSeller && <td className="py-3 px-2 text-right text-muted-foreground">{fmtFull(stat.faturamento)}</td>}
                    {!isSeller && <td className="py-3 px-2 text-right text-muted-foreground">{fmtFull(stat.ticketMedio)}</td>}
                    <td className="py-3 px-2"><ProgressBar value={stat.pctMeta} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>


      {/* Commission / Premiação section - admin/manager only */}
      {!isSeller && (
        <div className="glass-card p-5 animate-in" style={{ animationDelay: '500ms' }}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Premiações por Vendedor</h3>
          <div className="space-y-4">
            {vendedorStats.map(stat => (
              <div key={stat.vendedor.id} className="p-4 rounded-lg bg-secondary/30 border border-border/30">
                <div className="flex items-center gap-2 mb-3">
                  <VendorAvatar foto={stat.vendedor.foto} avatar={stat.vendedor.avatar} />
                  <span className="font-medium text-foreground">{stat.vendedor.nome}</span>
                  <span className="text-xs text-muted-foreground">— {stat.vendas}/{monthlyVendorGoals.get(stat.vendedor.id) ?? stat.vendedor.meta} vendas</span>
                </div>
                <CommissionProgress
                  vendedorNome={stat.vendedor.nome}
                  vendedorId={stat.vendedor.id}
                  vendas={stat.vendas}
                  meta={monthlyVendorGoals.get(stat.vendedor.id) ?? stat.vendedor.meta}
                  month={selectedMonth}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

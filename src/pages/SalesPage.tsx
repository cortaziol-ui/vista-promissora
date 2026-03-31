import { useState, useMemo, useEffect, useCallback } from 'react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { KpiCard } from '@/components/KpiCard';
import { ProgressBar } from '@/components/ProgressBar';
import { CommissionProgress } from '@/components/CommissionProgress';
import { useSalesData } from '@/contexts/SalesDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountContext } from '@/contexts/AccountContext';
import { supabase } from '@/integrations/supabase/client';
import { fetchCampaignInsights, type MetaCampaign } from '@/lib/metaAdsApi';
import { useCampaignLinks } from '@/hooks/useCampaignLinks';
import { getLeadsByVendor } from '@/lib/vendorLeads';
import { DollarSign, Target, ShoppingCart, TrendingUp, CheckCircle2, XCircle, CalendarDays, BarChart3 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const fmtFull = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmt = (v: number) => `R$ ${(v / 1000).toFixed(1)}k`;

/** Build a label like "Mar/2026" from "2026-03" */
function monthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[Number(m) - 1]}/${y}`;
}

export default function SalesPage() {
  const {
    clientes,
    filteredClientes,
    vendedores,
    vendedorStats,
    metaEmpresaVendas,
    pctMeta,
    projecao,
    selectedMonth,
    setSelectedMonth,
  } = useSalesData();

  const [filterVendedor, setFilterVendedor] = useState('all');

  const { activeAccount } = useAccountContext();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [metaCampaigns, setMetaCampaigns] = useState<MetaCampaign[]>([]);

  // Load Meta token
  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'meta_access_token').maybeSingle()
      .then(({ data }) => { if (data?.value) setAccessToken(data.value); });
  }, []);

  // Fetch campaigns for selected month
  const syncMeta = useCallback(async () => {
    if (!accessToken || !activeAccount?.ad_account_id) return;
    const [selYear, selMonthStr] = selectedMonth.split('-');
    const lastDay = new Date(Number(selYear), Number(selMonthStr), 0).getDate();
    const since = `${selYear}-${selMonthStr}-01`;
    const until = `${selYear}-${selMonthStr}-${String(lastDay).padStart(2, '0')}`;
    const result = await fetchCampaignInsights(accessToken, activeAccount.ad_account_id, { since, until });
    if (!result.error) {
      setMetaCampaigns(result.campaigns);
    }
  }, [selectedMonth, accessToken, activeAccount]);

  useEffect(() => {
    if (accessToken && activeAccount) {
      syncMeta();
    }
  }, [accessToken, activeAccount, syncMeta]);

  // Campaign links and vendor leads
  const { links } = useCampaignLinks({ campaigns: metaCampaigns, vendedores, month: selectedMonth });

  const vendorLeadsMap = useMemo(
    () => getLeadsByVendor(links, metaCampaigns),
    [links, metaCampaigns]
  );

  // Derive available months from all clientes
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    clientes.forEach(c => {
      const parts = (c.data || '').split('/');
      if (parts.length === 3) {
        const [, mm, yyyy] = parts;
        if (yyyy && mm) set.add(`${yyyy}-${mm.padStart(2, '0')}`);
      }
    });
    return Array.from(set).sort().reverse();
  }, [clientes]);

  // Local filtering by vendedor (uses filteredClientes which is already month-filtered)
  const localClientes = useMemo(() => {
    if (filterVendedor === 'all') return filteredClientes;
    return filteredClientes.filter(c => c.vendedor === filterVendedor);
  }, [filteredClientes, filterVendedor]);

  const { isSeller } = useAuth();

  const filteredStats = useMemo(() => {
    if (filterVendedor === 'all') return vendedorStats;
    return vendedorStats.filter(s => s.vendedor.nome === filterVendedor);
  }, [vendedorStats, filterVendedor]);

  // Sellers see ALL vendors' commissions on this page; admin/manager don't see commission here (moved to OverviewPage)
  const commissionStats = useMemo(() => {
    if (isSeller) {
      return vendedorStats;
    }
    return []; // admin/manager: commission section hidden on SalesPage
  }, [isSeller, vendedorStats]);

  // Local computed values based on vendedor filter
  const localFaturamento = useMemo(() => localClientes.reduce((s, c) => s + (c.entrada || 0), 0), [localClientes]);
  const localTotalVendas = localClientes.length;
  const localTicketMedio = localTotalVendas > 0 ? localFaturamento / localTotalVendas : 0;
  const localPctMeta = filterVendedor === 'all'
    ? pctMeta
    : filteredStats.length > 0 ? filteredStats[0].pctMeta : 0;
  const localMetaVendas = filterVendedor === 'all'
    ? metaEmpresaVendas
    : filteredStats.length > 0 ? filteredStats[0].vendedor.meta : 0;

  const dailySales = useMemo(() => {
    const byDay: Record<string, number> = {};
    localClientes.forEach(c => {
      const day = (c.data || '').split('/')[0];
      byDay[day] = (byDay[day] || 0) + 1;
    });
    return Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([day, value]) => ({ day, value }));
  }, [localClientes]);

  // Top 3 vendors from previous month
  const prevMonth = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedMonth]);

  const prevMonthLabel = useMemo(() => {
    const [y, m] = prevMonth.split('-');
    const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${names[Number(m) - 1]}/${y}`;
  }, [prevMonth]);

  const top3PrevMonth = useMemo(() => {
    const prevClientes = clientes.filter(c => {
      if (!c.data) return false;
      const parts = c.data.split('/');
      if (parts.length !== 3) return false;
      return `${parts[2]}-${parts[1].padStart(2, '0')}` === prevMonth;
    });
    const counts: Record<string, number> = {};
    prevClientes.forEach(c => { counts[c.vendedor] = (counts[c.vendedor] || 0) + 1; });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([nome, vendas], i) => {
        const v = vendedores.find(v => v.nome === nome);
        return { nome, vendas, rank: i + 1, avatar: v?.avatar || '👤', foto: v?.foto };
      });
  }, [clientes, prevMonth, vendedores]);

  // Birthday check
  // Birthday: show all month (not just today)
  const aniversariantes = useMemo(() => {
    const mesHoje = String(new Date().getMonth() + 1).padStart(2, '0');
    return vendedores
      .filter(v => {
        if (!v.aniversario) return false;
        let dia: string, mes: string;
        if (v.aniversario.includes('-')) {
          const parts = v.aniversario.split('-');
          mes = parts[1]; dia = parts[2];
        } else {
          const parts = v.aniversario.split('/');
          dia = parts[0]; mes = parts[1];
        }
        return mes === mesHoje;
      })
      .map(v => {
        let dia = '';
        if (v.aniversario!.includes('-')) dia = v.aniversario!.split('-')[2];
        else dia = v.aniversario!.split('/')[0];
        return { ...v, diaAniversario: dia };
      });
  }, [vendedores]);

  return (
    <div className="space-y-6">
      {/* Birthday banner */}
      {aniversariantes.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-pink-500/10 to-purple-500/10 border border-amber-500/20">
          <span className="text-lg">🎂</span>
          <p className="text-sm text-foreground">
            Aniversariantes do mês: {aniversariantes.map((v, i) => <span key={v.id}>{i > 0 && ', '}<span className="font-semibold">{v.nome}</span> <span className="text-muted-foreground text-xs">({v.diaAniversario}/{String(new Date().getMonth() + 1).padStart(2, '0')})</span></span>)}
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard de Vendas</h1>
          <p className="text-muted-foreground text-sm">Analise detalhada de performance — {monthLabel(selectedMonth)}</p>
        </div>
        <div className="flex items-center gap-3">
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
          <Select value={filterVendedor} onValueChange={setFilterVendedor}>
            <SelectTrigger className="w-[180px] bg-secondary border-border/50"><SelectValue placeholder="Todos vendedores" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos vendedores</SelectItem>
              {vendedores.map(v => <SelectItem key={v.id} value={v.nome}>{v.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isSeller ? 'lg:grid-cols-4' : 'lg:grid-cols-5'} gap-4`}>
        <KpiCard title="Meta Mensal" value={`${localMetaVendas} vendas`} icon={<Target className="w-5 h-5 text-kpi-goal" />} glowClass="kpi-glow-goal" colorClass="bg-kpi-goal/15" />
        <KpiCard title="% da Meta" value={`${localPctMeta.toFixed(1)}%`} subtitle={`Faltam ${Math.max(0, localMetaVendas - localTotalVendas)} vendas`} icon={<TrendingUp className="w-5 h-5 text-kpi-goal-pct" />} glowClass="kpi-glow-pct" colorClass="bg-kpi-goal-pct/15" />
        <KpiCard title="Total Vendas" value={String(localTotalVendas)} icon={<ShoppingCart className="w-5 h-5 text-kpi-sales" />} glowClass="kpi-glow-sales" colorClass="bg-kpi-sales/15" />
        <KpiCard title="Projeção" value={`${Math.round(projecao)} vendas`} icon={<BarChart3 className="w-5 h-5 text-kpi-projection" />} glowClass="kpi-glow-projection" colorClass="bg-kpi-projection/15" />
        {!isSeller && (
          <KpiCard title="Faturamento" value={fmtFull(localFaturamento)} icon={<DollarSign className="w-5 h-5 text-kpi-revenue" />} glowClass="kpi-glow-revenue" colorClass="bg-kpi-revenue/15" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Vendas por Dia</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                <XAxis dataKey="day" stroke="hsl(215, 20%, 65%)" fontSize={12} />
                <YAxis stroke="hsl(215, 20%, 65%)" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'hsl(220, 39%, 10%)', border: '1px solid hsl(220, 20%, 18%)', borderRadius: '8px', color: '#f1f5f9' }} formatter={(v: number) => [v, 'Vendas']} />
                <Bar dataKey="value" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Top 3 do mês anterior */}
        <div className="glass-card p-5 bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/20">
          <h3 className="text-sm font-semibold text-foreground mb-1">Top 3 Vendedores</h3>
          <p className="text-xs text-muted-foreground mb-5">{prevMonthLabel}</p>
          {top3PrevMonth.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados do mês anterior</p>
          ) : (
            <div className="flex flex-col items-center gap-4">
              {top3PrevMonth.map((v, i) => {
                const medals = ['🥇', '🥈', '🥉'];
                const sizes = ['w-16 h-16 text-3xl', 'w-12 h-12 text-2xl', 'w-12 h-12 text-2xl'];
                const nameSizes = ['text-base font-bold', 'text-sm font-semibold', 'text-sm font-semibold'];
                const glows = [
                  'ring-2 ring-amber-400/40 shadow-[0_0_16px_rgba(251,191,36,0.3)]',
                  'ring-2 ring-gray-400/30',
                  'ring-2 ring-amber-700/30',
                ];
                return (
                  <div key={v.nome} className="flex items-center gap-4 w-full">
                    <span className="text-2xl w-8 text-center">{medals[i]}</span>
                    <div className={`${sizes[i]} rounded-full bg-secondary flex items-center justify-center shrink-0 overflow-hidden ${glows[i]}`}>
                      {v.foto ? (
                        <img src={v.foto} alt={v.nome} className="w-full h-full object-cover" />
                      ) : (
                        <span>{v.avatar}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-foreground ${nameSizes[i]}`}>{v.nome}</p>
                      <p className="text-xs text-muted-foreground">{v.vendas} vendas</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                <th className="text-right py-3 px-2">Vendas</th>
                <th className="text-right py-3 px-2">Leads</th>
                <th className="text-right py-3 px-2">Conversao</th>
                <th className="text-right py-3 px-2">Faltam</th>
                <th className="text-center py-3 px-2">Projeção</th>
                {!isSeller && <th className="text-right py-3 px-2">Faturamento</th>}
                {!isSeller && <th className="text-right py-3 px-2">Ticket Médio</th>}
                <th className="text-left py-3 px-2 min-w-[140px]">% Meta</th>
              </tr>
            </thead>
            <tbody>
              {filteredStats.map((stat, i) => {
                const vendorLeads = vendorLeadsMap[stat.vendedor.id];
                const leadsCount = vendorLeads?.leads ?? 0;
                const conversionRate = leadsCount > 0 ? (stat.vendas / leadsCount) * 100 : 0;

                return (
                  <tr key={stat.vendedor.id} className="border-b border-border/30 hover:bg-secondary/50 transition-colors">
                    <td className={`py-3 px-2 font-bold ${i < 3 ? ['text-medal-gold', 'text-medal-silver', 'text-medal-bronze'][i] : 'text-muted-foreground'}`}>
                      {i < 3 ? ['\u{1F947}', '\u{1F948}', '\u{1F949}'][i] : i + 1}
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
                    <td className="py-3 px-2 text-right text-kpi-goal font-medium">{stat.vendedor.meta} vendas</td>
                    <td className="py-3 px-2 text-right font-semibold text-foreground">{stat.vendas}</td>
                    <td className="py-3 px-2 text-right text-muted-foreground">{vendorLeads ? leadsCount : '\u2014'}</td>
                    <td className="py-3 px-2 text-right text-muted-foreground">{vendorLeads && leadsCount > 0 ? `${conversionRate.toFixed(1)}%` : '\u2014'}</td>
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

      {/* Commission section - only visible for sellers */}
      {commissionStats.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Premiacoes por Vendedor</h3>
          <div className="space-y-4">
            {commissionStats.map(stat => (
              <div key={stat.vendedor.id} className="p-4 rounded-lg bg-secondary/30 border border-border/30">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{stat.vendedor.avatar}</span>
                  <span className="font-medium text-foreground">{stat.vendedor.nome}</span>
                  <span className="text-xs text-muted-foreground">— {stat.vendas}/{stat.vendedor.meta} vendas</span>
                </div>
                <CommissionProgress
                  vendedorNome={stat.vendedor.nome}
                  vendas={stat.vendas}
                  meta={stat.vendedor.meta}
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

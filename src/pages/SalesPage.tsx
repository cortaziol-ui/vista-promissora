import { useState, useMemo, useEffect } from 'react';
import { KpiCard } from '@/components/KpiCard';
import { DailySalesGrid } from '@/components/DailySalesGrid';
import { ProgressBar } from '@/components/ProgressBar';
import { CommissionProgress } from '@/components/CommissionProgress';
import { useSalesData } from '@/contexts/SalesDataContext';
import { useMonthlyData } from '@/hooks/useMonthlyData';
import { useAvailableMonths } from '@/hooks/useAvailableMonths';
import { getCurrentMonth, monthLabel, countWeekdays } from '@/lib/dateUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountContext } from '@/contexts/AccountContext';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { fetchCampaignInsights, type MetaCampaign } from '@/lib/metaAdsApi';
import { useCampaignLinks } from '@/hooks/useCampaignLinks';
import { getLeadsByVendor } from '@/lib/vendorLeads';
import { DollarSign, Target, ShoppingCart, TrendingUp, CheckCircle2, XCircle, CalendarDays, BarChart3, Monitor, MonitorSmartphone } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VendorAvatar } from '@/components/VendorAvatar';

const fmtFull = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmt = (v: number) => `R$ ${(v / 1000).toFixed(1)}k`;

export default function SalesPage() {
  const { activeAccountId } = useTenant();
  const { clientes, vendedores } = useSalesData();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const {
    filteredClientes,
    vendedorStats,
    metaEmpresaVendas,
    pctMeta,
    projecao,
    vendorGoals: monthlyVendorGoals,
  } = useMonthlyData(selectedMonth);

  const availableMonths = useAvailableMonths(clientes);
  const [filterVendedor, setFilterVendedor] = useState('all');
  const [tableView, setTableView] = useState<'geral' | 'semana'>('geral');
  const [viewMode, setViewMode] = useState<'desktop' | 'vertical'>(() => {
    return (localStorage.getItem('salesViewMode') as 'desktop' | 'vertical') || 'desktop';
  });
  const isVertical = viewMode === 'vertical';

  const handleViewMode = (mode: 'desktop' | 'vertical') => {
    setViewMode(mode);
    localStorage.setItem('salesViewMode', mode);
  };

  const { activeAccount } = useAccountContext();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [metaCampaigns, setMetaCampaigns] = useState<MetaCampaign[]>([]);

  // Load Meta token
  useEffect(() => {
    if (!activeAccountId) return;
    supabase.from('app_settings').select('value').eq('account_id', activeAccountId).eq('key', 'meta_access_token').maybeSingle()
      .then(({ data }) => { if (data?.value) setAccessToken(data.value); });
  }, [activeAccountId]);

  // Fetch campaigns for selected month
  useEffect(() => {
    if (!accessToken || !activeAccount?.ad_account_id) return;
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
            setMetaCampaigns(result.campaigns);
          } else {
            setMetaCampaigns([]);
          }
        }
      } catch {
        if (!cancelled) setMetaCampaigns([]);
      }
    }

    sync();
    return () => { cancelled = true; };
  }, [selectedMonth, accessToken, activeAccount]);

  // Campaign links and vendor leads
  const { links } = useCampaignLinks({ campaigns: metaCampaigns, vendedores, month: selectedMonth });

  const vendorLeadsMap = useMemo(
    () => getLeadsByVendor(links, metaCampaigns),
    [links, metaCampaigns]
  );

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

  const commissionStats = vendedorStats;

  // Local computed values based on vendedor filter
  const localFaturamento = useMemo(() => localClientes.reduce((s, c) => s + (c.entrada || 0), 0), [localClientes]);
  // LIMPA NOME + RATING counts as 2 sales (same rule as useMonthlyData)
  const localTotalVendas = useMemo(
    () => localClientes.reduce((s, c) => s + (c.servico === 'LIMPA NOME + RATING' ? 2 : 1), 0),
    [localClientes],
  );
  const localTicketMedio = localTotalVendas > 0 ? localFaturamento / localTotalVendas : 0;
  const localPctMeta = filterVendedor === 'all'
    ? pctMeta
    : filteredStats.length > 0 ? filteredStats[0].pctMeta : 0;
  const localMetaVendas = filterVendedor === 'all'
    ? metaEmpresaVendas
    : filteredStats.length > 0 ? filteredStats[0].vendedor.meta : 0;

  // === WEEKLY / DAILY GOAL ENGINE WITH REDISTRIBUTION ===
  interface WeekInfo {
    weekNum: number;
    label: string;        // "Semana 1 (01/04 - 04/04)"
    fromDay: number;
    toDay: number;
    workingDays: number;
    baseMeta: number;     // meta original (sem redistribuição)
    adjustedMeta: number; // meta ajustada com carry-over
    sales: number;
    completed: boolean;   // meta semanal batida
    isCurrent: boolean;
  }

  interface VendorWeeklyData {
    weeks: WeekInfo[];
    currentWeekMeta: number;
    dailyGoal: number;
    currentWeekIdx: number;
    baseDailyGoal: number;
    currentWeekSales: number;
  }

  const weeklyEngine = useMemo(() => {
    const [selYear, selMonthStr] = selectedMonth.split('-').map(Number);
    const now = new Date();
    const isCurrentMonth = selYear === now.getFullYear() && selMonthStr === (now.getMonth() + 1);
    const lastDayOfMonth = new Date(selYear, selMonthStr, 0).getDate();
    const today = isCurrentMonth ? now.getDate() : lastDayOfMonth;

    // Build list of working days in the month (actual calendar days that are Mon-Fri)
    const workingDaysList: number[] = [];
    for (let d = 1; d <= lastDayOfMonth; d++) {
      const dow = new Date(selYear, selMonthStr - 1, d).getDay();
      if (dow !== 0 && dow !== 6) workingDaysList.push(d);
    }
    const totalWorkingDays = workingDaysList.length;

    // Split into exactly 4 weeks based on working days
    const weekRanges: { fromDay: number; toDay: number; days: number[] }[] = [];
    const baseSize = Math.floor(totalWorkingDays / 4);
    const extra = totalWorkingDays % 4;
    let offset = 0;
    for (let w = 0; w < 4; w++) {
      const size = baseSize + (w < extra ? 1 : 0);
      const chunk = workingDaysList.slice(offset, offset + size);
      if (chunk.length > 0) {
        weekRanges.push({ fromDay: chunk[0], toDay: chunk[chunk.length - 1], days: chunk });
      }
      offset += size;
    }

    // Helper: count sales in day range for a vendor
    const salesInRange = (vendorName: string | null, fromDay: number, toDay: number) => {
      return filteredClientes.filter(c => {
        if (vendorName && c.vendedor !== vendorName) return false;
        const parts = c.data?.split('/');
        if (!parts || parts.length !== 3) return false;
        const day = parseInt(parts[0], 10);
        return day >= fromDay && day <= toDay;
      }).length;
    };

    // Helper: format day as DD/MM
    const fmtDay = (d: number) => `${String(d).padStart(2, '0')}/${String(selMonthStr).padStart(2, '0')}`;

    // Compute weeks for a given vendor (null = global)
    const computeVendorWeeks = (meta: number, vendorName: string | null): VendorWeeklyData => {
      const dailyBase = totalWorkingDays > 0 ? meta / totalWorkingDays : 0;
      let carry = 0; // deficit from previous weeks
      let currentWeekIdx = 0;

      const weeks: WeekInfo[] = weekRanges.map((wr, idx) => {
        const workingDays = wr.days.length;
        const baseMeta = Math.round(dailyBase * workingDays);
        const adjustedMeta = Math.round(baseMeta + carry);
        const sales = salesInRange(vendorName, wr.fromDay, wr.toDay);
        const isCurrent = isCurrentMonth && today >= wr.fromDay && today <= wr.toDay;
        if (isCurrent) currentWeekIdx = idx;

        // For past weeks, calculate carry-over for next week
        const isPast = isCurrentMonth ? today > wr.toDay : true;
        if (isPast) {
          carry = Math.max(0, adjustedMeta - sales);
        } else if (isCurrent) {
          // Don't carry current week yet — it's in progress
          carry = 0;
        } else {
          carry = 0; // future weeks don't carry yet
        }

        return {
          weekNum: idx + 1,
          label: `Semana ${idx + 1} (${fmtDay(wr.fromDay)} - ${fmtDay(wr.toDay)})`,
          fromDay: wr.fromDay,
          toDay: wr.toDay,
          workingDays,
          baseMeta,
          adjustedMeta: Math.max(0, adjustedMeta),
          sales,
          completed: sales >= Math.max(0, adjustedMeta),
          isCurrent,
        };
      });

      // Recalculate: redistribute deficit from all past weeks into remaining weeks
      let totalDeficit = 0;
      weeks.forEach(w => {
        if (!w.isCurrent && today > w.toDay) {
          totalDeficit += Math.max(0, w.adjustedMeta - w.sales);
        }
      });
      // Spread deficit across current + future weeks
      const remainingWeeks = weeks.filter(w => w.isCurrent || (isCurrentMonth && today < w.fromDay));
      const totalRemainingWorkingDays = remainingWeeks.reduce((s, w) => s + w.workingDays, 0);
      if (totalDeficit > 0 && totalRemainingWorkingDays > 0) {
        remainingWeeks.forEach(w => {
          const share = Math.round((w.workingDays / totalRemainingWorkingDays) * totalDeficit);
          w.adjustedMeta = Math.round((meta / totalWorkingDays) * w.workingDays) + share;
          w.completed = w.sales >= w.adjustedMeta;
        });
      }

      // Daily goal: never goes below base, only goes up when behind
      const cw = weeks[currentWeekIdx];
      const baseDailyGoal = Math.ceil(dailyBase); // floor daily goal (never decreases)
      let dailyGoal = baseDailyGoal;
      if (isCurrentMonth) {
        const totalSales = weeks.reduce((s, w) => s + w.sales, 0);
        const remainingSales = Math.max(0, meta - totalSales);
        const remainingDaysInMonth = workingDaysList.filter(d => d >= today).length;
        const dynamicDaily = remainingDaysInMonth > 0 ? Math.ceil(remainingSales / remainingDaysInMonth) : 0;
        // Only goes UP, never below the base. Mantém meta base mesmo após
        // bater meta mensal — vendedor não fica com MD=0 ao superar meta.
        dailyGoal = Math.max(baseDailyGoal, dynamicDaily);
      }

      // Current week sales for display
      const currentWeekSales = cw ? cw.sales : 0;

      return { weeks, currentWeekMeta: cw?.adjustedMeta ?? 0, dailyGoal, currentWeekIdx, baseDailyGoal, currentWeekSales };
    };

    // Global computation
    const globalData = computeVendorWeeks(
      localMetaVendas,
      filterVendedor === 'all' ? null : filterVendedor
    );

    // Per-vendor computation
    const vendorData = new Map<number, VendorWeeklyData>();
    vendedorStats.forEach(stat => {
      const vMeta = monthlyVendorGoals.get(stat.vendedor.id) ?? stat.vendedor.meta;
      vendorData.set(stat.vendedor.id, computeVendorWeeks(vMeta, stat.vendedor.nome));
    });

    return {
      weeklyGoal: globalData.currentWeekMeta,
      dailyGoal: globalData.dailyGoal,
      currentWeekSales: globalData.currentWeekSales,
      weeks: globalData.weeks,
      currentWeekIdx: globalData.currentWeekIdx,
      vendorData,
    };
  }, [selectedMonth, localMetaVendas, filteredClientes, filterVendedor, vendedorStats, monthlyVendorGoals]);

  const todaySalesCount = useMemo(() => {
    const todayStr = String(new Date().getDate()).padStart(2, '0');
    return localClientes.filter(c => c.data?.startsWith(todayStr + '/')).length;
  }, [localClientes]);

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
    <div className={isVertical ? 'flex flex-col gap-2' : 'space-y-3'}>
      {/* Birthday banner — apenas vertical (no desktop, aniversariantes vão pro card Top 3) */}
      {isVertical && aniversariantes.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-pink-500/10 to-purple-500/10 border border-amber-500/20">
          <span className="text-base">🎂</span>
          <p className="text-xs text-foreground">
            Aniversariantes do mês: {aniversariantes.map((v, i) => <span key={v.id}>{i > 0 && ', '}<span className="font-semibold">{v.nome}</span> <span className="text-muted-foreground text-xs">({v.diaAniversario}/{String(new Date().getMonth() + 1).padStart(2, '0')})</span></span>)}
          </p>
        </div>
      )}

      <div className={`flex flex-col sm:flex-row sm:items-center justify-between ${isVertical ? 'gap-1' : 'gap-3'}`}>
        <div>
          <h1 className={`${isVertical ? 'text-lg' : 'text-xl'} font-bold text-foreground leading-tight`}>Dashboard de Vendas</h1>
          {!isVertical && <p className="text-muted-foreground text-xs">Analise detalhada de performance — {monthLabel(selectedMonth)}</p>}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
            <button
              onClick={() => handleViewMode('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${viewMode === 'desktop' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Monitor className="w-3.5 h-3.5" />
              Desktop
            </button>
            <button
              onClick={() => handleViewMode('vertical')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${viewMode === 'vertical' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <MonitorSmartphone className="w-3.5 h-3.5" />
              Vertical
            </button>
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
          <Select value={filterVendedor} onValueChange={setFilterVendedor}>
            <SelectTrigger className="w-[180px] bg-secondary border-border/50"><SelectValue placeholder="Todos vendedores" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos vendedores</SelectItem>
              {vendedores.map(v => <SelectItem key={v.id} value={v.nome}>{v.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={`grid ${isVertical ? 'grid-cols-3 gap-2' : `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${isSeller ? 'xl:grid-cols-6' : 'xl:grid-cols-7'} gap-3`}`}>
        <KpiCard title="Meta Mensal (MM)" value={`${localTotalVendas}/${localMetaVendas}`} subtitle={`${Math.max(0, localMetaVendas - localTotalVendas)} restantes`} icon={<Target className={`${isVertical ? 'w-3.5 h-3.5' : 'w-5 h-5'} text-kpi-goal`} />} glowClass="kpi-glow-goal" colorClass="bg-kpi-goal/15" size={isVertical ? 'compact' : 'default'} />
        <KpiCard title={`Meta Semanal (S${weeklyEngine.currentWeekIdx + 1})`} value={`${weeklyEngine.currentWeekSales}/${weeklyEngine.weeklyGoal}`} subtitle={weeklyEngine.currentWeekSales >= weeklyEngine.weeklyGoal ? 'Meta batida!' : `${Math.max(0, weeklyEngine.weeklyGoal - weeklyEngine.currentWeekSales)} restantes`} icon={<CalendarDays className={`${isVertical ? 'w-3.5 h-3.5' : 'w-5 h-5'} text-kpi-projection`} />} glowClass="kpi-glow-projection" colorClass="bg-kpi-projection/15" size={isVertical ? 'compact' : 'default'} />
        <KpiCard title="Meta Diária (MD)" value={`${todaySalesCount}/${weeklyEngine.dailyGoal}`} subtitle={todaySalesCount >= weeklyEngine.dailyGoal ? 'Meta batida!' : `${Math.max(0, weeklyEngine.dailyGoal - todaySalesCount)} restantes`} icon={<BarChart3 className={`${isVertical ? 'w-3.5 h-3.5' : 'w-5 h-5'} text-kpi-revenue`} />} glowClass="kpi-glow-revenue" colorClass="bg-kpi-revenue/15" size={isVertical ? 'compact' : 'default'} />
        <KpiCard title="% da Meta" value={`${localPctMeta.toFixed(1)}%`} subtitle={`Faltam ${Math.max(0, localMetaVendas - localTotalVendas)} vendas`} icon={<TrendingUp className={`${isVertical ? 'w-3.5 h-3.5' : 'w-5 h-5'} text-kpi-goal-pct`} />} glowClass="kpi-glow-pct" colorClass="bg-kpi-goal-pct/15" size={isVertical ? 'compact' : 'default'} />
        <KpiCard title="Total Vendas" value={String(localTotalVendas)} icon={<ShoppingCart className={`${isVertical ? 'w-3.5 h-3.5' : 'w-5 h-5'} text-kpi-sales`} />} glowClass="kpi-glow-sales" colorClass="bg-kpi-sales/15" size={isVertical ? 'compact' : 'default'} />
        <KpiCard title="Projeção" value={`${Math.round(projecao)} vendas`} icon={<BarChart3 className={`${isVertical ? 'w-3.5 h-3.5' : 'w-5 h-5'} text-kpi-projection`} />} glowClass="kpi-glow-projection" colorClass="bg-kpi-projection/15" size={isVertical ? 'compact' : 'default'} />
        {!isSeller && (
          <KpiCard title="Faturamento" value={fmtFull(localFaturamento)} icon={<DollarSign className={`${isVertical ? 'w-3.5 h-3.5' : 'w-5 h-5'} text-kpi-revenue`} />} glowClass="kpi-glow-revenue" colorClass="bg-kpi-revenue/15" size={isVertical ? 'compact' : 'default'} />
        )}
      </div>

      {/* DESKTOP: Performance por Vendedor sobe pra cá (Vendas por Dia + Top 3 descem pra depois da tabela) */}
      {/* VERTICAL: ordem original (Vendas por Dia + Top 3 primeiro, Performance depois) */}
      {isVertical && (
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 glass-card p-2.5">
            <h3 className="text-xs font-semibold text-foreground mb-1.5">Vendas por Dia</h3>
            <DailySalesGrid dailySales={dailySales} selectedMonth={selectedMonth} isVertical={isVertical} />
          </div>
          <div className="glass-card p-2.5 flex flex-col justify-center bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/20">
            <h3 className="text-xs font-semibold text-foreground mb-0.5">Top 3 Vendedores</h3>
            <p className="text-[10px] text-muted-foreground mb-1.5">{prevMonthLabel}</p>
            {top3PrevMonth.length === 0 ? (
              <p className="text-base text-muted-foreground text-center py-8">Sem dados do mês anterior</p>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                {top3PrevMonth.map((v, i) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  const sizes = ['w-8 h-8 text-sm', 'w-7 h-7 text-xs', 'w-7 h-7 text-xs'];
                  const nameSizes = ['text-xs font-bold', 'text-xs font-semibold', 'text-xs font-semibold'];
                  const glows = [
                    'ring-2 ring-amber-400/40 shadow-[0_0_16px_rgba(251,191,36,0.3)]',
                    'ring-2 ring-gray-400/30',
                    'ring-2 ring-amber-700/30',
                  ];
                  return (
                    <div key={v.nome} className="flex items-center gap-2 w-full">
                      <span className="text-sm w-5 text-center">{medals[i]}</span>
                      <div className={`${sizes[i]} rounded-full bg-secondary flex items-center justify-center shrink-0 overflow-hidden ${glows[i]}`}>
                        {v.foto ? (
                          <img src={v.foto} alt={v.nome} className="w-full h-full object-cover" />
                        ) : (
                          <span>{v.avatar}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-foreground ${nameSizes[i]}`}>{v.nome}</p>
                        <p className="text-[10px] text-muted-foreground">{v.vendas} vendas</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seller Detail Table */}
      <div className={`glass-card ${isVertical ? 'p-2.5' : 'p-3'}`}>
        <div className={`flex items-center justify-between ${isVertical ? 'mb-1.5' : 'mb-2'}`}>
          <h3 className={`${isVertical ? 'text-xs' : 'text-sm'} font-semibold text-foreground`}>Performance por Vendedor</h3>
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
            <button
              onClick={() => setTableView('geral')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${tableView === 'geral' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Geral
            </button>
            <button
              onClick={() => setTableView('semana')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${tableView === 'semana' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Por Semana
            </button>
          </div>
        </div>

        {tableView === 'geral' ? (
          <div className="overflow-x-auto">
            <table className={`w-full ${isVertical ? 'text-xs' : 'text-sm'}`}>
              <thead>
                <tr className="text-muted-foreground border-b border-border/50">
                  <th className={`text-left ${isVertical ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>#</th>
                  <th className={`text-left ${isVertical ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>Vendedor</th>
                  <th className={`text-right ${isVertical ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>MM</th>
                  <th className={`text-right ${isVertical ? 'py-1 px-1.5' : 'py-1.5 px-2'} relative group`}>
                    MS{weeklyEngine.currentWeekIdx + 1}
                    <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 rounded bg-popover border border-border text-xs text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50 shadow-lg">
                      {weeklyEngine.weeks[weeklyEngine.currentWeekIdx]?.label ?? ''}
                    </span>
                  </th>
                  <th className={`text-right ${isVertical ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>MD</th>
                  <th className={`text-right ${isVertical ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>Vendas</th>
                  <th className={`text-right ${isVertical ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>Leads</th>
                  <th className={`text-right ${isVertical ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>Conversao</th>
                  <th className={`text-right ${isVertical ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>Faltam</th>
                  <th className={`text-center ${isVertical ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>Projeção</th>
                  {!isSeller && <th className={`text-right ${isVertical ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>Faturamento</th>}
                  {!isSeller && <th className={`text-right ${isVertical ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>Ticket Médio</th>}
                  <th className={`text-left ${isVertical ? 'py-1 px-1.5 min-w-[90px]' : 'py-1.5 px-2 min-w-[140px]'}`}>% Meta</th>
                </tr>
              </thead>
              <tbody>
                {filteredStats.map((stat, i) => {
                  const vendorLeads = vendorLeadsMap[stat.vendedor.id];
                  const leadsCount = vendorLeads?.leads ?? 0;
                  const conversionRate = leadsCount > 0 ? (stat.vendas / leadsCount) * 100 : 0;

                  return (
                    <tr key={stat.vendedor.id} className="border-b border-border/30 hover:bg-secondary/50 transition-colors">
                      <td className={`${isVertical ? 'py-1 px-1.5' : 'py-1.5 px-2'} font-bold ${i < 3 ? ['text-medal-gold', 'text-medal-silver', 'text-medal-bronze'][i] : 'text-muted-foreground'}`}>
                        {i < 3 ? ['\u{1F947}', '\u{1F948}', '\u{1F949}'][i] : i + 1}
                      </td>
                      <td className={`${isVertical ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                        <div className="flex items-center gap-3">
                          <VendorAvatar foto={stat.vendedor.foto} avatar={stat.vendedor.avatar} size="lg" />
                          <div>
                            <p className={`font-medium text-foreground ${isVertical ? 'text-xs' : ''}`}>{stat.vendedor.nome}</p>
                            <p className={`${isVertical ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>{stat.vendedor.cargo}</p>
                          </div>
                        </div>
                      </td>
                      <td className={`${isVertical ? 'py-1 px-1.5' : 'py-1.5 px-2'} text-right text-kpi-goal font-medium`}>{monthlyVendorGoals.get(stat.vendedor.id) ?? stat.vendedor.meta}</td>
                      <td className={`${isVertical ? 'py-1 px-1.5' : 'py-1.5 px-2'} text-right`}>
                        {(() => {
                          const vd = weeklyEngine.vendorData.get(stat.vendedor.id);
                          const cw = vd?.weeks[vd.currentWeekIdx];
                          if (!cw) return <span className="text-muted-foreground">—</span>;
                          return cw.completed ? (
                            <span className="inline-flex items-center gap-1 text-green-500 font-medium">
                              {cw.adjustedMeta} <CheckCircle2 className={isVertical ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{cw.sales}/{cw.adjustedMeta}</span>
                          );
                        })()}
                      </td>
                      <td className={`${isVertical ? 'py-1 px-1.5' : 'py-1.5 px-2'} text-right text-muted-foreground`}>{weeklyEngine.vendorData.get(stat.vendedor.id)?.dailyGoal ?? '—'}</td>
                      <td className={`${isVertical ? 'py-1 px-1.5' : 'py-1.5 px-2'} text-right font-semibold text-foreground`}>{stat.vendas}</td>
                      <td className={`${isVertical ? 'py-1 px-1.5' : 'py-1.5 px-2'} text-right text-muted-foreground`}>{vendorLeads ? leadsCount : '\u2014'}</td>
                      <td className={`${isVertical ? 'py-1 px-1.5' : 'py-1.5 px-2'} text-right text-muted-foreground`}>{vendorLeads && leadsCount > 0 ? `${conversionRate.toFixed(1)}%` : '\u2014'}</td>
                      <td className={`${isVertical ? 'py-1 px-1.5' : 'py-1.5 px-2'} text-right text-muted-foreground`}>{stat.faltam} vendas</td>
                      <td className={`${isVertical ? 'py-1 px-1.5' : 'py-1.5 px-2'} text-center`}>
                        {stat.dentroProjecao
                          ? <CheckCircle2 className={`${isVertical ? 'w-4 h-4' : 'w-5 h-5'} text-green-500 inline-block`} />
                          : <XCircle className={`${isVertical ? 'w-4 h-4' : 'w-5 h-5'} text-red-500 inline-block`} />
                        }
                      </td>
                      {!isSeller && <td className={`${isVertical ? 'py-1 px-1.5' : 'py-1.5 px-2'} text-right text-muted-foreground`}>{fmtFull(stat.faturamento)}</td>}
                      {!isSeller && <td className={`${isVertical ? 'py-1 px-1.5' : 'py-1.5 px-2'} text-right text-muted-foreground`}>{fmtFull(stat.ticketMedio)}</td>}
                      <td className={`${isVertical ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}><ProgressBar value={stat.pctMeta} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* === WEEK VIEW === */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border/50">
                  <th className="text-left py-1.5 px-2">Vendedor</th>
                  {weeklyEngine.weeks.map(w => (
                    <th key={w.weekNum} className={`text-center py-3 px-3 ${w.isCurrent ? 'text-primary bg-primary/5' : ''}`}>
                      <div className="text-sm font-semibold leading-tight">S{w.weekNum}</div>
                      <div className="text-[11px] text-muted-foreground/70 leading-tight">
                        {String(w.fromDay).padStart(2, '0')}/{String(selectedMonth.split('-')[1]).padStart(2, '0')} - {String(w.toDay).padStart(2, '0')}/{String(selectedMonth.split('-')[1]).padStart(2, '0')}
                      </div>
                    </th>
                  ))}
                  <th className="text-right py-1.5 px-2">Total</th>
                  <th className="text-left py-1.5 px-2 min-w-[100px]">% Meta</th>
                </tr>
              </thead>
              <tbody>
                {filteredStats.map(stat => {
                  const vd = weeklyEngine.vendorData.get(stat.vendedor.id);
                  return (
                    <tr key={stat.vendedor.id} className="border-b border-border/30 hover:bg-secondary/50 transition-colors">
                      <td className="py-1.5 px-2">
                        <div className="flex items-center gap-2">
                          <VendorAvatar foto={stat.vendedor.foto} avatar={stat.vendedor.avatar} />
                          <span className="font-medium text-foreground text-xs">{stat.vendedor.nome}</span>
                        </div>
                      </td>
                      {(vd?.weeks ?? []).map(w => (
                        <td key={w.weekNum} className={`py-3 px-3 text-center ${w.isCurrent ? 'bg-primary/5' : ''}`}>
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-foreground text-sm">{w.sales}</span>
                              <span className="text-muted-foreground text-xs">/{w.adjustedMeta}</span>
                            </div>
                            {w.completed && (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                        </td>
                      ))}
                      <td className="py-1.5 px-2 text-right font-semibold text-foreground">{stat.vendas}</td>
                      <td className="py-1.5 px-2"><ProgressBar value={stat.pctMeta} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DESKTOP: Vendas por Dia + Top 3 descem pra baixo da tabela Performance */}
      {!isVertical && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 glass-card p-3">
            <h3 className="text-sm font-semibold text-foreground mb-2">Vendas por Dia</h3>
            <DailySalesGrid dailySales={dailySales} selectedMonth={selectedMonth} isVertical={isVertical} />
          </div>
          <div className="glass-card p-3 bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/20">
            <div className="grid grid-cols-2 gap-3 divide-x divide-border/30">
              {/* Top 3 Vendedores */}
              <div className="pr-1">
                <h3 className="text-sm font-semibold text-foreground mb-0.5">Top 3 Vendedores</h3>
                <p className="text-xs text-muted-foreground mb-2">{prevMonthLabel}</p>
                {top3PrevMonth.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados do mês anterior</p>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    {top3PrevMonth.map((v, i) => {
                      const medals = ['🥇', '🥈', '🥉'];
                      const sizes = ['w-12 h-12 text-2xl', 'w-10 h-10 text-xl', 'w-10 h-10 text-xl'];
                      const nameSizes = ['text-sm font-bold', 'text-xs font-semibold', 'text-xs font-semibold'];
                      const glows = [
                        'ring-2 ring-amber-400/40 shadow-[0_0_16px_rgba(251,191,36,0.3)]',
                        'ring-2 ring-gray-400/30',
                        'ring-2 ring-amber-700/30',
                      ];
                      return (
                        <div key={v.nome} className="flex items-center gap-2 w-full">
                          <span className="text-lg w-6 text-center">{medals[i]}</span>
                          <div className={`${sizes[i]} rounded-full bg-secondary flex items-center justify-center shrink-0 overflow-hidden ${glows[i]}`}>
                            {v.foto ? (
                              <img src={v.foto} alt={v.nome} className="w-full h-full object-cover" />
                            ) : (
                              <span>{v.avatar}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-foreground ${nameSizes[i]} truncate`}>{v.nome}</p>
                            <p className="text-[11px] text-muted-foreground">{v.vendas} vendas</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Aniversariantes do mês */}
              <div className="pl-3">
                <h3 className="text-sm font-semibold text-foreground mb-0.5">
                  <span className="mr-1">🎂</span>Aniversariantes
                </h3>
                <p className="text-xs text-muted-foreground mb-2">{['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][new Date().getMonth()]}</p>
                {aniversariantes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum este mês</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {aniversariantes.map(v => (
                      <div key={v.id} className="flex items-center gap-2 w-full">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-pink-400/30">
                          {v.foto ? (
                            <img src={v.foto} alt={v.nome} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl">{v.avatar}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground text-xs font-semibold truncate">{v.nome}</p>
                          <p className="text-[11px] text-muted-foreground">{v.diaAniversario}/{String(new Date().getMonth() + 1).padStart(2, '0')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Commission section - visible for sellers */}
      {commissionStats.length > 0 && (
        <div className={`glass-card ${isVertical ? 'p-3' : 'p-5'}`}>
          <h3 className={`${isVertical ? 'text-base' : 'text-sm'} font-semibold text-foreground ${isVertical ? 'mb-2' : 'mb-4'}`}>Premiacoes por Vendedor</h3>
          <div className={`${isVertical ? 'space-y-3' : 'space-y-4'}`}>
            {commissionStats.map(stat => (
              <div key={stat.vendedor.id} className={`${isVertical ? 'p-3' : 'p-4'} rounded-lg bg-secondary/30 border border-border/30`}>
                <div className={`flex items-center gap-2 ${isVertical ? 'mb-2' : 'mb-3'}`}>
                  <VendorAvatar foto={stat.vendedor.foto} avatar={stat.vendedor.avatar} />
                  <span className={`font-medium text-foreground ${isVertical ? 'text-base' : ''}`}>{stat.vendedor.nome}</span>
                  <span className={`${isVertical ? 'text-sm' : 'text-xs'} text-muted-foreground`}>— {stat.vendas}/{monthlyVendorGoals.get(stat.vendedor.id) ?? stat.vendedor.meta} vendas</span>
                </div>
                <CommissionProgress
                  vendedorNome={stat.vendedor.nome}
                  vendedorId={stat.vendedor.id}
                  vendas={stat.vendas}
                  meta={monthlyVendorGoals.get(stat.vendedor.id) ?? stat.vendedor.meta}
                  month={selectedMonth}
                  size={isVertical ? 'compact' : 'default'}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

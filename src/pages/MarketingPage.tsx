import { useState, useMemo, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { KpiCard } from '@/components/KpiCard';
import { Users, DollarSign, MousePointerClick, Target, TrendingUp, TrendingDown, Megaphone, AlertCircle, RefreshCw, ArrowUpRight, ArrowDownRight, Minus, Zap, Pause, Rocket } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { fetchCampaignInsights, type MetaInsights, type MetaCampaign } from '@/lib/metaAdsApi';
import { useAccountContext } from '@/contexts/AccountContext';
import { supabase } from '@/integrations/supabase/client';

const fmtFull = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtNum = (v: number) => new Intl.NumberFormat('pt-BR').format(v);
const COLORS = ['hsl(217, 91%, 60%)', 'hsl(255, 62%, 68%)', 'hsl(160, 84%, 39%)', 'hsl(199, 89%, 60%)', 'hsl(330, 81%, 60%)', 'hsl(38, 92%, 50%)'];

// Vendor aliases for grouping
const VENDOR_ALIASES: Record<string, string> = {
  BIANCA: 'Bianca', NAYRA: 'Nayra', LUCAS: 'Lucas Cunha',
  MARTINS: 'Lucas Martins', GUSTAVO: 'Gustavo',
};

function detectVendor(name: string): string {
  const upper = name.toUpperCase();
  if (upper.includes('MARTINS')) return 'Lucas Martins';
  if (upper.includes('BIANCA')) return 'Bianca';
  if (upper.includes('NAYRA')) return 'Nayra';
  if (upper.includes('LUCAS')) return 'Lucas Cunha';
  if (upper.includes('GUSTAVO')) return 'Gustavo';
  return 'Outros';
}

interface CampaignData {
  name: string;
  cost: number;
  cpc: number;
  cpl: number;
  ctr: number;
  leads: number;
  status: string;
  vendor: string;
}

export default function MarketingPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const { activeAccount } = useAccountContext();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [metaConnected, setMetaConnected] = useState(false);
  const [metaInsights, setMetaInsights] = useState<MetaInsights | null>(null);
  const [metaCampaigns, setMetaCampaigns] = useState<MetaCampaign[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [rankingMode, setRankingMode] = useState<'cost' | 'leads' | 'cpl'>('cost');

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'meta_access_token').maybeSingle()
      .then(({ data }) => { if (data?.value) setAccessToken(data.value); });
  }, []);

  const syncMeta = useCallback(async () => {
    if (!accessToken || !activeAccount?.ad_account_id) return;
    setSyncing(true);
    setSyncError(null);
    const since = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const until = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const result = await fetchCampaignInsights(accessToken, activeAccount.ad_account_id, { since, until });
    setSyncing(false);
    if (result.error) { setSyncError(result.error); } else { setMetaInsights(result.insights); setMetaCampaigns(result.campaigns); }
  }, [year, month, accessToken, activeAccount]);

  useEffect(() => {
    if (accessToken && activeAccount) { setMetaConnected(true); syncMeta(); } else { setMetaConnected(false); }
  }, [accessToken, activeAccount, syncMeta]);

  const impressions = metaInsights?.impressions ?? 0;
  const clicks = metaInsights?.clicks ?? 0;
  const totalCost = metaInsights?.spend ?? 0;
  const cpc = metaInsights?.cpc ?? 0;
  const ctr = metaInsights?.ctr ?? 0;
  const totalLeads = metaInsights?.leads ?? 0;
  const cpl = totalLeads > 0 ? totalCost / totalLeads : 0;
  const conversions = metaInsights?.conversions ?? 0;
  const conversionRate = totalLeads > 0 ? (conversions / totalLeads) * 100 : 0;

  // Campaign data with vendor detection
  const campaigns = useMemo<CampaignData[]>(() => {
    return metaCampaigns
      .filter(c => c.insights && c.insights.spend > 0)
      .map(c => {
        const ins = c.insights!;
        return {
          name: c.name, cost: ins.spend, cpc: ins.cpc,
          cpl: ins.leads > 0 ? ins.spend / ins.leads : 0,
          ctr: ins.ctr, leads: ins.leads, status: c.status,
          vendor: detectVendor(c.name),
        };
      });
  }, [metaCampaigns]);

  // Averages for scoring
  const avgCtr = useMemo(() => {
    const withData = campaigns.filter(c => c.leads > 0);
    return withData.length > 0 ? withData.reduce((s, c) => s + c.ctr, 0) / withData.length : 0;
  }, [campaigns]);

  const avgCpl = useMemo(() => {
    const withData = campaigns.filter(c => c.leads > 0);
    return withData.length > 0 ? withData.reduce((s, c) => s + c.cpl, 0) / withData.length : 0;
  }, [campaigns]);

  // Score campaign: green/yellow/red
  function scoreCampaign(c: CampaignData): { color: 'green' | 'yellow' | 'red'; label: string; action: string } {
    if (c.leads === 0) return { color: 'red', label: 'Sem leads', action: 'Revisar público e criativo' };
    const ctrGood = c.ctr >= avgCtr * 1.2;
    const ctrBad = c.ctr < avgCtr * 0.8;
    const cplGood = c.cpl <= avgCpl * 0.8;
    const cplBad = c.cpl > avgCpl * 1.2;

    if (ctrGood && cplGood) return { color: 'green', label: 'Escalar', action: 'Aumentar orçamento' };
    if (ctrGood && !cplBad) return { color: 'green', label: 'Escalar', action: 'Escalar orçamento' };
    if (ctrBad && cplBad) return { color: 'red', label: 'Pausar', action: 'Pausar ou revisar criativo' };
    if (cplBad) return { color: 'red', label: 'Rever', action: 'Testar novo criativo' };
    return { color: 'yellow', label: 'Otimizar', action: 'Otimizar público' };
  }

  function ctrColor(v: number): string {
    if (avgCtr === 0) return 'text-muted-foreground';
    if (v >= avgCtr * 1.2) return 'text-green-400';
    if (v < avgCtr * 0.8) return 'text-red-400';
    return 'text-amber-400';
  }

  function cplColor(v: number): string {
    if (avgCpl === 0 || v === 0) return 'text-muted-foreground';
    if (v <= avgCpl * 0.8) return 'text-green-400';
    if (v > avgCpl * 1.2) return 'text-red-400';
    return 'text-amber-400';
  }

  // Top 8 ranking
  const ranking = useMemo(() => {
    const sorted = [...campaigns];
    if (rankingMode === 'cost') sorted.sort((a, b) => b.cost - a.cost);
    else if (rankingMode === 'leads') sorted.sort((a, b) => b.leads - a.leads);
    else sorted.sort((a, b) => (a.cpl || 9999) - (b.cpl || 9999));
    return sorted.slice(0, 8);
  }, [campaigns, rankingMode]);

  // Vendor grouping
  const vendorData = useMemo(() => {
    const groups: Record<string, { spend: number; leads: number; campaigns: number }> = {};
    campaigns.forEach(c => {
      if (!groups[c.vendor]) groups[c.vendor] = { spend: 0, leads: 0, campaigns: 0 };
      groups[c.vendor].spend += c.cost;
      groups[c.vendor].leads += c.leads;
      groups[c.vendor].campaigns++;
    });
    return Object.entries(groups)
      .map(([name, d]) => ({ name, ...d, cpl: d.leads > 0 ? d.spend / d.leads : 0 }))
      .sort((a, b) => b.spend - a.spend);
  }, [campaigns]);

  // Cards sorted by score then leads
  const campaignCards = useMemo(() => {
    return [...campaigns]
      .filter(c => c.leads > 0)
      .sort((a, b) => b.leads - a.leads);
  }, [campaigns]);

  if (!metaConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Marketing Analytics</h1>
          <p className="text-muted-foreground text-sm">Conecte sua conta Meta Ads para visualizar os dados.</p>
        </div>
        <div className="glass-card p-10 border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent flex flex-col items-center gap-5 text-center">
          <AlertCircle className="w-16 h-16 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Meta Ads não conectado</h2>
          <p className="text-sm text-muted-foreground max-w-md">Conecte sua conta na página de <strong>Configurações</strong>.</p>
          <Button variant="outline" onClick={() => window.location.hash = '#/settings'}>Ir para Configurações</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Marketing Analytics</h1>
          <p className="text-muted-foreground text-sm">Dashboard de decisão — {months[month]}/{year}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={syncMeta} disabled={syncing} variant="outline" size="sm" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Atualizar'}
          </Button>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-[100px] bg-secondary border-border/50"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value={String(now.getFullYear())}>{now.getFullYear()}</SelectItem></SelectContent>
          </Select>
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-[140px] bg-secondary border-border/50"><SelectValue /></SelectTrigger>
            <SelectContent>{months.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        <KpiCard title="Impressões" value={fmtNum(impressions)} icon={<Users className="w-5 h-5 text-kpi-sales" />} glowClass="kpi-glow-sales" colorClass="bg-kpi-sales/15" delay={0} />
        <KpiCard title="Cliques" value={fmtNum(clicks)} icon={<MousePointerClick className="w-5 h-5 text-kpi-goal-pct" />} glowClass="kpi-glow-pct" colorClass="bg-kpi-goal-pct/15" delay={50} />
        <KpiCard title="Investimento" value={fmtFull(totalCost)} icon={<Megaphone className="w-5 h-5 text-kpi-goal" />} glowClass="kpi-glow-goal" colorClass="bg-kpi-goal/15" delay={100} />
        <KpiCard title="CPC" value={fmtFull(cpc)} icon={<DollarSign className="w-5 h-5 text-kpi-revenue" />} glowClass="kpi-glow-revenue" colorClass="bg-kpi-revenue/15" delay={150} />
        <KpiCard title="CTR" value={`${Number(ctr).toFixed(2)}%`} icon={<Target className="w-5 h-5 text-kpi-ticket" />} glowClass="kpi-glow-ticket" colorClass="bg-kpi-ticket/15" delay={200} />
        <KpiCard title="Leads" value={fmtNum(totalLeads)} icon={<TrendingUp className="w-5 h-5 text-kpi-projection" />} glowClass="kpi-glow-projection" colorClass="bg-kpi-projection/15" delay={250} />
        <KpiCard title="CPL" value={fmtFull(cpl)} icon={<DollarSign className="w-5 h-5 text-kpi-revenue" />} glowClass="kpi-glow-revenue" colorClass="bg-kpi-revenue/15" delay={300} />
        <KpiCard title="Conversão" value={`${conversionRate.toFixed(1)}%`} icon={<TrendingUp className="w-5 h-5 text-kpi-projection" />} glowClass="kpi-glow-projection" colorClass="bg-kpi-projection/15" delay={350} />
      </div>

      {syncing && (
        <div className="glass-card p-6 flex items-center justify-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Sincronizando dados do Meta Ads...</span>
        </div>
      )}

      {syncError && !syncing && (
        <div className="glass-card p-6 border border-destructive/30 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
          <p className="text-sm text-muted-foreground max-w-lg">{syncError}</p>
          <Button onClick={syncMeta} variant="outline" size="sm" className="gap-2"><RefreshCw className="w-4 h-4" /> Tentar novamente</Button>
        </div>
      )}

      {/* Section 1: Ranking + Investimento por Vendedor */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Top 8 Ranking */}
        <div className="lg:col-span-3 glass-card bg-gradient-to-br from-primary/5 to-transparent border border-border/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground">Ranking de Campanhas</h3>
            <div className="flex gap-1">
              {(['cost', 'leads', 'cpl'] as const).map(mode => (
                <button key={mode} onClick={() => setRankingMode(mode)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${rankingMode === mode ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                  {mode === 'cost' ? 'Investimento' : mode === 'leads' ? 'Leads' : 'Melhor CPL'}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {ranking.map((c, i) => {
              const maxVal = ranking[0]?.[rankingMode === 'cpl' ? 'cpl' : rankingMode] || 1;
              const val = rankingMode === 'cpl' ? c.cpl : c[rankingMode];
              const pct = rankingMode === 'cpl' ? (maxVal > 0 ? (1 - val / (maxVal * 1.5)) * 100 : 0) : (maxVal > 0 ? (val / maxVal) * 100 : 0);
              return (
                <div key={c.name} className="group flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors" title={c.name}>
                  <span className="text-xs text-muted-foreground w-5 text-right font-mono">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">{c.name}</p>
                    <div className="mt-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-primary/70 transition-all duration-500" style={{ width: `${Math.max(pct, 3)}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                    {rankingMode === 'cost' ? fmtFull(c.cost) : rankingMode === 'leads' ? `${c.leads} leads` : fmtFull(c.cpl)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Investimento por Vendedor */}
        <div className="lg:col-span-2 glass-card bg-gradient-to-br from-primary/5 to-transparent border border-border/30 p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">Investimento por Vendedor</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vendorData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 16%)" />
                <XAxis type="number" stroke="hsl(215, 20%, 55%)" fontSize={11} tickFormatter={v => `R$${Math.round(v)}`} />
                <YAxis type="category" dataKey="name" stroke="hsl(215, 20%, 55%)" fontSize={11} width={100} />
                <Tooltip contentStyle={{ background: 'hsl(220, 39%, 8%)', border: '1px solid hsl(220, 20%, 20%)', borderRadius: '12px', color: '#f1f5f9', padding: '12px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} formatter={(v: number) => [fmtFull(v), 'Investimento']} />
                <Bar dataKey="spend" fill="hsl(217, 91%, 60%)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Vendor summary cards */}
          <div className="mt-4 space-y-2">
            {vendorData.map((v, i) => (
              <div key={v.name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-xs font-medium text-foreground">{v.name}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{v.leads} leads</span>
                  <span>{v.campaigns} camp.</span>
                  <span className="font-semibold text-foreground">{fmtFull(v.spend)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 2: Campaign Decision Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">Campanhas — Decisão Rápida</h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> Escalar</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Otimizar</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Pausar/Rever</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {campaignCards.map(c => {
            const score = scoreCampaign(c);
            const borderColor = score.color === 'green' ? 'border-green-500/40' : score.color === 'yellow' ? 'border-amber-500/40' : 'border-red-500/40';
            const bgColor = score.color === 'green' ? 'from-green-500/5' : score.color === 'yellow' ? 'from-amber-500/5' : 'from-red-500/5';
            const badgeColor = score.color === 'green' ? 'bg-green-500/20 text-green-400' : score.color === 'yellow' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400';
            const StatusIcon = score.color === 'green' ? Rocket : score.color === 'yellow' ? Zap : Pause;

            return (
              <div key={c.name} className={`glass-card bg-gradient-to-br ${bgColor} to-transparent border ${borderColor} p-4 hover:scale-[1.02] transition-all duration-200`}>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className="text-xs font-medium text-foreground leading-tight line-clamp-2" title={c.name}>{c.name}</p>
                  <span className={`shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
                    <StatusIcon className="w-3 h-3" />
                    {score.label}
                  </span>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Leads</p>
                    <p className="text-lg font-bold text-foreground">{c.leads}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">CPL</p>
                    <p className={`text-lg font-bold ${cplColor(c.cpl)}`}>{fmtFull(c.cpl)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">CTR</p>
                    <p className={`text-sm font-semibold ${ctrColor(c.ctr)}`}>{Number(c.ctr).toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Investido</p>
                    <p className="text-sm font-semibold text-foreground">{fmtFull(c.cost)}</p>
                  </div>
                </div>

                {/* Action */}
                <div className="pt-2 border-t border-border/30">
                  <p className="text-[10px] text-muted-foreground">
                    Ação sugerida: <span className="text-foreground font-medium">{score.action}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

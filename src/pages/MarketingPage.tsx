import { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { KpiCard } from '@/components/KpiCard';
import { leads } from '@/data/mockData';
import { Users, DollarSign, MousePointerClick, Target, TrendingUp, Megaphone, AlertCircle, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { getMetaConfig, getCachedInsights, fetchCampaignInsights, type MetaInsights, type MetaCampaign } from '@/lib/metaAdsApi';

const fmtFull = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtNum = (v: number) => new Intl.NumberFormat('pt-BR').format(v);
const COLORS = ['hsl(217, 91%, 60%)', 'hsl(255, 62%, 68%)', 'hsl(160, 84%, 39%)', 'hsl(199, 89%, 60%)', 'hsl(330, 81%, 60%)', 'hsl(38, 92%, 50%)'];

export default function MarketingPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [channel, setChannel] = useState('all');

  // Meta Ads state
  const [metaConnected, setMetaConnected] = useState(false);
  const [metaInsights, setMetaInsights] = useState<MetaInsights | null>(null);
  const [metaCampaigns, setMetaCampaigns] = useState<MetaCampaign[]>([]);
  const [syncing, setSyncing] = useState(false);

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  // Check Meta connection and load cached data
  useEffect(() => {
    const config = getMetaConfig();
    if (config?.connected && config.accessToken) {
      setMetaConnected(true);
      const cached = getCachedInsights();
      if (cached) {
        setMetaInsights(cached.data);
        setMetaCampaigns(cached.campaigns);
      }
    }
  }, []);

  const handleSyncMeta = async () => {
    const config = getMetaConfig();
    if (!config?.accessToken || !config.adAccountId) return;
    setSyncing(true);
    const since = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const until = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const result = await fetchCampaignInsights(config.accessToken, config.adAccountId, { since, until });
    setSyncing(false);
    if (!result.error) {
      setMetaInsights(result.insights);
      setMetaCampaigns(result.campaigns);
    }
  };

  // Fallback mock data
  const monthLeads = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    let filtered = leads.filter(l => l.date.startsWith(prefix));
    if (channel !== 'all') filtered = filtered.filter(l => l.source === channel);
    return filtered;
  }, [year, month, channel]);

  // Use Meta data if available, else mock
  const totalLeads = metaInsights ? metaInsights.leads : monthLeads.length;
  const totalCost = metaInsights ? metaInsights.spend : monthLeads.reduce((s, l) => s + l.cost, 0);
  const cpl = totalLeads > 0 ? totalCost / totalLeads : 0;
  const cpc = metaInsights ? metaInsights.cpc : (totalLeads > 0 ? totalCost / (totalLeads * 3.2) : 0);
  const ctr = metaInsights ? metaInsights.ctr : 4.2 + Math.random() * 2;
  const converted = metaInsights ? metaInsights.conversions : monthLeads.filter(l => l.converted).length;
  const conversionRate = totalLeads > 0 ? (converted / totalLeads) * 100 : 0;
  const impressions = metaInsights ? metaInsights.impressions : 0;
  const clicks = metaInsights ? metaInsights.clicks : 0;

  const leadsByDay = useMemo(() => {
    if (metaInsights) return []; // Meta doesn't give daily breakdown in this simple fetch
    const byDay: Record<string, number> = {};
    monthLeads.forEach(l => { const d = l.date.split('-')[2]; byDay[d] = (byDay[d] || 0) + 1; });
    return Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ day, count }));
  }, [monthLeads, metaInsights]);

  const bySource = useMemo(() => {
    if (metaInsights) return []; // Will use campaigns instead
    const map: Record<string, number> = {};
    monthLeads.forEach(l => { map[l.source] = (map[l.source] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [monthLeads, metaInsights]);

  const byCampaign = useMemo(() => {
    if (metaCampaigns.length > 0) {
      return metaCampaigns
        .filter(c => c.insights && c.insights.spend > 0)
        .map(c => ({ name: c.name, cost: c.insights!.spend, clicks: c.insights!.clicks, impressions: c.insights!.impressions }))
        .sort((a, b) => b.cost - a.cost);
    }
    const map: Record<string, number> = {};
    monthLeads.forEach(l => { map[l.campaign] = (map[l.campaign] || 0) + l.cost; });
    return Object.entries(map).map(([name, cost]) => ({ name, cost, clicks: 0, impressions: 0 })).sort((a, b) => b.cost - a.cost);
  }, [monthLeads, metaCampaigns]);

  // Campaign pie data for Meta
  const campaignPieData = useMemo(() => {
    if (metaCampaigns.length > 0) {
      return metaCampaigns
        .filter(c => c.insights && c.insights.spend > 0)
        .map(c => ({ name: c.name, value: c.insights!.spend }));
    }
    return bySource;
  }, [metaCampaigns, bySource]);

  const sources = useMemo(() => [...new Set(leads.map(l => l.source))], []);

  return (
    <div className="space-y-6">
      {/* Meta Ads connection banner */}
      {!metaConnected && (
        <div className="glass-card p-4 border border-[hsl(220,70%,55%)]/30 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[hsl(220,70%,55%)] shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-foreground font-medium">Meta Ads não conectado</p>
            <p className="text-xs text-muted-foreground">Conecte sua conta Meta Ads em <strong>Configurações</strong> para ver dados reais de campanhas.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marketing Analytics</h1>
          <p className="text-muted-foreground text-sm">
            {metaConnected ? 'Dados do Meta Ads' : 'Performance de campanhas e leads (dados simulados)'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {metaConnected && (
            <Button onClick={handleSyncMeta} disabled={syncing} variant="outline" size="sm" className="gap-2">
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Atualizar Meta'}
            </Button>
          )}
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-[100px] bg-secondary border-border/50"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value={String(now.getFullYear())}>{now.getFullYear()}</SelectItem></SelectContent>
          </Select>
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-[140px] bg-secondary border-border/50"><SelectValue /></SelectTrigger>
            <SelectContent>{months.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          {!metaConnected && (
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="w-[160px] bg-secondary border-border/50"><SelectValue placeholder="Todos canais" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos canais</SelectItem>
                {sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metaConnected ? (
          <>
            <KpiCard title="Impressões" value={fmtNum(impressions)} icon={<Users className="w-5 h-5 text-kpi-sales" />} glowClass="kpi-glow-sales" colorClass="bg-kpi-sales/15" />
            <KpiCard title="Cliques" value={fmtNum(clicks)} icon={<MousePointerClick className="w-5 h-5 text-kpi-goal-pct" />} glowClass="kpi-glow-pct" colorClass="bg-kpi-goal-pct/15" />
            <KpiCard title="Investimento" value={fmtFull(totalCost)} icon={<Megaphone className="w-5 h-5 text-kpi-goal" />} glowClass="kpi-glow-goal" colorClass="bg-kpi-goal/15" />
            <KpiCard title="CPC" value={fmtFull(cpc)} icon={<DollarSign className="w-5 h-5 text-kpi-revenue" />} glowClass="kpi-glow-revenue" colorClass="bg-kpi-revenue/15" />
            <KpiCard title="CTR" value={`${Number(ctr).toFixed(2)}%`} icon={<Target className="w-5 h-5 text-kpi-ticket" />} glowClass="kpi-glow-ticket" colorClass="bg-kpi-ticket/15" />
            <KpiCard title="Leads" value={String(totalLeads)} icon={<TrendingUp className="w-5 h-5 text-kpi-projection" />} glowClass="kpi-glow-projection" colorClass="bg-kpi-projection/15" />
          </>
        ) : (
          <>
            <KpiCard title="Leads Gerados" value={String(totalLeads)} icon={<Users className="w-5 h-5 text-kpi-sales" />} glowClass="kpi-glow-sales" colorClass="bg-kpi-sales/15" />
            <KpiCard title="Custo por Lead" value={fmtFull(cpl)} icon={<DollarSign className="w-5 h-5 text-kpi-revenue" />} glowClass="kpi-glow-revenue" colorClass="bg-kpi-revenue/15" />
            <KpiCard title="CPC" value={fmtFull(cpc)} icon={<MousePointerClick className="w-5 h-5 text-kpi-goal-pct" />} glowClass="kpi-glow-pct" colorClass="bg-kpi-goal-pct/15" />
            <KpiCard title="CTR" value={`${ctr.toFixed(1)}%`} icon={<Target className="w-5 h-5 text-kpi-ticket" />} glowClass="kpi-glow-ticket" colorClass="bg-kpi-ticket/15" />
            <KpiCard title="Taxa Conversão" value={`${conversionRate.toFixed(1)}%`} icon={<TrendingUp className="w-5 h-5 text-kpi-projection" />} glowClass="kpi-glow-projection" colorClass="bg-kpi-projection/15" />
            <KpiCard title="Investimento" value={fmtFull(totalCost)} icon={<Megaphone className="w-5 h-5 text-kpi-goal" />} glowClass="kpi-glow-goal" colorClass="bg-kpi-goal/15" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            {metaConnected ? 'Custo por Campanha (Meta Ads)' : 'Leads por Dia'}
          </h3>
          <div className="h-64">
            {metaConnected ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCampaign} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                  <XAxis type="number" stroke="hsl(215, 20%, 65%)" fontSize={12} tickFormatter={v => `R$${v}`} />
                  <YAxis type="category" dataKey="name" stroke="hsl(215, 20%, 65%)" fontSize={11} width={160} />
                  <Tooltip contentStyle={{ background: 'hsl(220, 39%, 10%)', border: '1px solid hsl(220, 20%, 18%)', borderRadius: '8px', color: '#f1f5f9' }} formatter={(v: number) => [fmtFull(v), 'Custo']} />
                  <Bar dataKey="cost" fill="hsl(220, 70%, 55%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={leadsByDay}>
                  <defs>
                    <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(199, 89%, 60%)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(199, 89%, 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                  <XAxis dataKey="day" stroke="hsl(215, 20%, 65%)" fontSize={12} />
                  <YAxis stroke="hsl(215, 20%, 65%)" fontSize={12} />
                  <Tooltip contentStyle={{ background: 'hsl(220, 39%, 10%)', border: '1px solid hsl(220, 20%, 18%)', borderRadius: '8px', color: '#f1f5f9' }} />
                  <Area type="monotone" dataKey="count" stroke="hsl(199, 89%, 60%)" fill="url(#leadsGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            {metaConnected ? 'Distribuição de Investimento' : 'Leads por Canal'}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={campaignPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                  {campaignPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(220, 39%, 10%)', border: '1px solid hsl(220, 20%, 18%)', borderRadius: '8px', color: '#f1f5f9' }} formatter={(v: number) => metaConnected ? [fmtFull(v), 'Investimento'] : [v, 'Leads']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {campaignPieData.map((s, i) => (
              <span key={s.name} className="text-xs flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                {s.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {!metaConnected && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Custo por Campanha</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCampaign} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                <XAxis type="number" stroke="hsl(215, 20%, 65%)" fontSize={12} tickFormatter={v => `R$${v}`} />
                <YAxis type="category" dataKey="name" stroke="hsl(215, 20%, 65%)" fontSize={11} width={120} />
                <Tooltip contentStyle={{ background: 'hsl(220, 39%, 10%)', border: '1px solid hsl(220, 20%, 18%)', borderRadius: '8px', color: '#f1f5f9' }} formatter={(v: number) => [fmtFull(v), 'Custo']} />
                <Bar dataKey="cost" fill="hsl(255, 62%, 68%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

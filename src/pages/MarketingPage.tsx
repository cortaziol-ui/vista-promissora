import { useState, useMemo, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { KpiCard } from '@/components/KpiCard';
import { Users, DollarSign, MousePointerClick, Target, TrendingUp, Megaphone, AlertCircle, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { getMetaConfig, getCachedInsights, fetchCampaignInsights, type MetaInsights, type MetaCampaign } from '@/lib/metaAdsApi';

const fmtFull = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtNum = (v: number) => new Intl.NumberFormat('pt-BR').format(v);
const COLORS = ['hsl(217, 91%, 60%)', 'hsl(255, 62%, 68%)', 'hsl(160, 84%, 39%)', 'hsl(199, 89%, 60%)', 'hsl(330, 81%, 60%)', 'hsl(38, 92%, 50%)'];

export default function MarketingPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [metaConnected, setMetaConnected] = useState(false);
  const [metaInsights, setMetaInsights] = useState<MetaInsights | null>(null);
  const [metaCampaigns, setMetaCampaigns] = useState<MetaCampaign[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const syncMeta = useCallback(async () => {
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
  }, [year, month]);

  // Check connection + auto-sync
  useEffect(() => {
    const config = getMetaConfig();
    if (config?.connected && config.accessToken) {
      setMetaConnected(true);
      const cached = getCachedInsights();
      if (cached) {
        setMetaInsights(cached.data);
        setMetaCampaigns(cached.campaigns);
      }
      // Auto-sync
      syncMeta();
    } else {
      setMetaConnected(false);
    }
  }, [syncMeta]);

  const impressions = metaInsights?.impressions ?? 0;
  const clicks = metaInsights?.clicks ?? 0;
  const totalCost = metaInsights?.spend ?? 0;
  const cpc = metaInsights?.cpc ?? 0;
  const ctr = metaInsights?.ctr ?? 0;
  const totalLeads = metaInsights?.leads ?? 0;
  const cpl = totalLeads > 0 ? totalCost / totalLeads : 0;
  const conversions = metaInsights?.conversions ?? 0;
  const conversionRate = totalLeads > 0 ? (conversions / totalLeads) * 100 : 0;

  const campaignTableData = useMemo(() => {
    return metaCampaigns
      .filter(c => c.insights && c.insights.spend > 0)
      .map(c => {
        const ins = c.insights!;
        return {
          name: c.name,
          cost: ins.spend,
          cpc: ins.cpc,
          cpl: ins.leads > 0 ? ins.spend / ins.leads : 0,
          ctr: ins.ctr,
          leads: ins.leads,
        };
      })
      .sort((a, b) => b.cost - a.cost);
  }, [metaCampaigns]);

  const campaignPieData = useMemo(() => {
    return metaCampaigns
      .filter(c => c.insights && c.insights.spend > 0)
      .map(c => ({ name: c.name, value: c.insights!.spend }));
  }, [metaCampaigns]);

  if (!metaConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marketing Analytics</h1>
          <p className="text-muted-foreground text-sm">Conecte sua conta Meta Ads para visualizar os dados.</p>
        </div>
        <div className="glass-card p-8 border border-primary/30 flex flex-col items-center gap-4 text-center">
          <AlertCircle className="w-12 h-12 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Meta Ads não conectado</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Para visualizar dados reais de campanhas, impressões, cliques, CPC, CTR e leads, conecte sua conta Meta Ads na página de <strong>Configurações</strong>.
          </p>
          <Button variant="outline" onClick={() => window.location.hash = '#/settings'}>
            Ir para Configurações
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marketing Analytics</h1>
          <p className="text-muted-foreground text-sm">Dados do Meta Ads</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={syncMeta} disabled={syncing} variant="outline" size="sm" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Atualizar Meta'}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        <KpiCard title="Impressões" value={fmtNum(impressions)} icon={<Users className="w-5 h-5 text-kpi-sales" />} glowClass="kpi-glow-sales" colorClass="bg-kpi-sales/15" />
        <KpiCard title="Cliques" value={fmtNum(clicks)} icon={<MousePointerClick className="w-5 h-5 text-kpi-goal-pct" />} glowClass="kpi-glow-pct" colorClass="bg-kpi-goal-pct/15" />
        <KpiCard title="Investimento" value={fmtFull(totalCost)} icon={<Megaphone className="w-5 h-5 text-kpi-goal" />} glowClass="kpi-glow-goal" colorClass="bg-kpi-goal/15" />
        <KpiCard title="CPC" value={fmtFull(cpc)} icon={<DollarSign className="w-5 h-5 text-kpi-revenue" />} glowClass="kpi-glow-revenue" colorClass="bg-kpi-revenue/15" />
        <KpiCard title="CTR" value={`${Number(ctr).toFixed(2)}%`} icon={<Target className="w-5 h-5 text-kpi-ticket" />} glowClass="kpi-glow-ticket" colorClass="bg-kpi-ticket/15" />
        <KpiCard title="Leads" value={String(totalLeads)} icon={<TrendingUp className="w-5 h-5 text-kpi-projection" />} glowClass="kpi-glow-projection" colorClass="bg-kpi-projection/15" />
        <KpiCard title="CPL" value={fmtFull(cpl)} icon={<DollarSign className="w-5 h-5 text-kpi-revenue" />} glowClass="kpi-glow-revenue" colorClass="bg-kpi-revenue/15" />
        <KpiCard title="Conversão" value={`${conversionRate.toFixed(1)}%`} icon={<TrendingUp className="w-5 h-5 text-kpi-projection" />} glowClass="kpi-glow-projection" colorClass="bg-kpi-projection/15" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Investimento por Campanha</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaignTableData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                <XAxis type="number" stroke="hsl(215, 20%, 65%)" fontSize={12} tickFormatter={v => `R$${v}`} />
                <YAxis type="category" dataKey="name" stroke="hsl(215, 20%, 65%)" fontSize={11} width={160} />
                <Tooltip contentStyle={{ background: 'hsl(220, 39%, 10%)', border: '1px solid hsl(220, 20%, 18%)', borderRadius: '8px', color: '#f1f5f9' }} formatter={(v: number) => [fmtFull(v), 'Custo']} />
                <Bar dataKey="cost" fill="hsl(220, 70%, 55%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição de Investimento</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={campaignPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                  {campaignPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(220, 39%, 10%)', border: '1px solid hsl(220, 20%, 18%)', borderRadius: '8px', color: '#f1f5f9' }} formatter={(v: number) => [fmtFull(v), 'Investimento']} />
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

      {/* Campaign Performance Table */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Performance por Campanha</h3>
        {campaignTableData.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campanha</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">CPC</TableHead>
                <TableHead className="text-right">CPL</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">Leads</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaignTableData.map((c) => (
                <TableRow key={c.name}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-right">{fmtFull(c.cost)}</TableCell>
                  <TableCell className="text-right">{fmtFull(c.cpc)}</TableCell>
                  <TableCell className="text-right">{c.leads > 0 ? fmtFull(c.cpl) : '—'}</TableCell>
                  <TableCell className="text-right">{Number(c.ctr).toFixed(2)}%</TableCell>
                  <TableCell className="text-right">{c.leads}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma campanha com dados no período selecionado. Clique em "Atualizar Meta" para sincronizar.</p>
        )}
      </div>
    </div>
  );
}

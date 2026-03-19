import { useState, useMemo } from 'react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { KpiCard } from '@/components/KpiCard';
import { leads } from '@/data/mockData';
import { Users, DollarSign, MousePointerClick, Target, TrendingUp, Megaphone } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const fmtFull = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const COLORS = ['hsl(217, 91%, 60%)', 'hsl(255, 62%, 68%)', 'hsl(160, 84%, 39%)', 'hsl(199, 89%, 60%)', 'hsl(330, 81%, 60%)', 'hsl(38, 92%, 50%)'];

export default function MarketingPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [channel, setChannel] = useState('all');

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const monthLeads = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    let filtered = leads.filter(l => l.date.startsWith(prefix));
    if (channel !== 'all') filtered = filtered.filter(l => l.source === channel);
    return filtered;
  }, [year, month, channel]);

  const totalLeads = monthLeads.length;
  const totalCost = monthLeads.reduce((s, l) => s + l.cost, 0);
  const converted = monthLeads.filter(l => l.converted).length;
  const cpl = totalLeads > 0 ? totalCost / totalLeads : 0;
  const conversionRate = totalLeads > 0 ? (converted / totalLeads) * 100 : 0;
  const cpc = totalLeads > 0 ? totalCost / (totalLeads * 3.2) : 0; // simulated clicks
  const ctr = 4.2 + Math.random() * 2; // simulated

  const leadsByDay = useMemo(() => {
    const byDay: Record<string, number> = {};
    monthLeads.forEach(l => { const d = l.date.split('-')[2]; byDay[d] = (byDay[d] || 0) + 1; });
    return Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ day, count }));
  }, [monthLeads]);

  const bySource = useMemo(() => {
    const map: Record<string, number> = {};
    monthLeads.forEach(l => { map[l.source] = (map[l.source] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [monthLeads]);

  const byCampaign = useMemo(() => {
    const map: Record<string, number> = {};
    monthLeads.forEach(l => { map[l.campaign] = (map[l.campaign] || 0) + l.cost; });
    return Object.entries(map).map(([name, cost]) => ({ name, cost })).sort((a, b) => b.cost - a.cost);
  }, [monthLeads]);

  const sources = useMemo(() => [...new Set(leads.map(l => l.source))], []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marketing Analytics</h1>
          <p className="text-muted-foreground text-sm">Performance de campanhas e leads</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-[100px] bg-secondary border-border/50"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value={String(now.getFullYear())}>{now.getFullYear()}</SelectItem></SelectContent>
          </Select>
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-[140px] bg-secondary border-border/50"><SelectValue /></SelectTrigger>
            <SelectContent>{months.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="w-[160px] bg-secondary border-border/50"><SelectValue placeholder="Todos canais" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos canais</SelectItem>
              {sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard title="Leads Gerados" value={String(totalLeads)} icon={<Users className="w-5 h-5 text-kpi-sales" />} glowClass="kpi-glow-sales" colorClass="bg-kpi-sales/15" />
        <KpiCard title="Custo por Lead" value={fmtFull(cpl)} icon={<DollarSign className="w-5 h-5 text-kpi-revenue" />} glowClass="kpi-glow-revenue" colorClass="bg-kpi-revenue/15" />
        <KpiCard title="CPC" value={fmtFull(cpc)} icon={<MousePointerClick className="w-5 h-5 text-kpi-goal-pct" />} glowClass="kpi-glow-pct" colorClass="bg-kpi-goal-pct/15" />
        <KpiCard title="CTR" value={`${ctr.toFixed(1)}%`} icon={<Target className="w-5 h-5 text-kpi-ticket" />} glowClass="kpi-glow-ticket" colorClass="bg-kpi-ticket/15" />
        <KpiCard title="Taxa Conversão" value={`${conversionRate.toFixed(1)}%`} icon={<TrendingUp className="w-5 h-5 text-kpi-projection" />} glowClass="kpi-glow-projection" colorClass="bg-kpi-projection/15" />
        <KpiCard title="Investimento" value={fmtFull(totalCost)} icon={<Megaphone className="w-5 h-5 text-kpi-goal" />} glowClass="kpi-glow-goal" colorClass="bg-kpi-goal/15" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Leads por Dia</h3>
          <div className="h-64">
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
          </div>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Leads por Canal</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={bySource} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                  {bySource.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(220, 39%, 10%)', border: '1px solid hsl(220, 20%, 18%)', borderRadius: '8px', color: '#f1f5f9' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {bySource.map((s, i) => (
              <span key={s.name} className="text-xs flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                {s.name}
              </span>
            ))}
          </div>
        </div>
      </div>

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
    </div>
  );
}

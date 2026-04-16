import { useState, useMemo, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { KpiCard } from '@/components/KpiCard';
import { SmilePlus, Smile, Meh, Frown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

interface NPSEntry {
  id: string;
  date: string;
  score: number;
  comment: string | null;
}

export default function SatisfactionPage() {
  const { activeAccountId } = useTenant();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [npsEntries, setNpsEntries] = useState<NPSEntry[]>([]);
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  useEffect(() => {
    if (!activeAccountId) return;
    const fetchNps = async () => {
      const { data } = await supabase.from('nps_entries').select('*').eq('account_id', activeAccountId);
      if (data) setNpsEntries(data);
    };
    fetchNps();
  }, [activeAccountId]);

  const monthEntries = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return npsEntries.filter(e => e.date.startsWith(prefix));
  }, [year, month, npsEntries]);

  const promoters = monthEntries.filter(e => e.score >= 9).length;
  const passives = monthEntries.filter(e => e.score >= 7 && e.score <= 8).length;
  const detractors = monthEntries.filter(e => e.score <= 6).length;
  const total = monthEntries.length;
  const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

  const npsOverTime = useMemo(() => {
    const byDay: Record<string, { p: number; d: number; t: number }> = {};
    monthEntries.forEach(e => {
      const day = e.date.split('-')[2];
      if (!byDay[day]) byDay[day] = { p: 0, d: 0, t: 0 };
      byDay[day].t++;
      if (e.score >= 9) byDay[day].p++;
      if (e.score <= 6) byDay[day].d++;
    });
    return Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([day, d]) => ({
      day, nps: d.t > 0 ? Math.round(((d.p - d.d) / d.t) * 100) : 0,
    }));
  }, [monthEntries]);

  const distribution = useMemo(() => {
    const dist: Record<number, number> = {};
    for (let i = 1; i <= 10; i++) dist[i] = 0;
    monthEntries.forEach(e => { dist[e.score]++; });
    return Object.entries(dist).map(([score, count]) => ({ score: `${score}`, count }));
  }, [monthEntries]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Satisfação do Cliente</h1>
          <p className="text-muted-foreground text-sm">Net Promoter Score e métricas de satisfação</p>
        </div>
        <div className="flex gap-3">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="NPS Geral" value={String(nps)} icon={<SmilePlus className="w-5 h-5 text-kpi-sales" />} glowClass="kpi-glow-sales" colorClass="bg-kpi-sales/15" subtitle={`${total} avaliações`} />
        <KpiCard title="Promotores" value={String(promoters)} icon={<Smile className="w-5 h-5 text-kpi-ticket" />} glowClass="kpi-glow-ticket" colorClass="bg-kpi-ticket/15" subtitle={`${total > 0 ? ((promoters / total) * 100).toFixed(1) : 0}%`} />
        <KpiCard title="Neutros" value={String(passives)} icon={<Meh className="w-5 h-5 text-kpi-goal-pct" />} glowClass="kpi-glow-pct" colorClass="bg-kpi-goal-pct/15" subtitle={`${total > 0 ? ((passives / total) * 100).toFixed(1) : 0}%`} />
        <KpiCard title="Detratores" value={String(detractors)} icon={<Frown className="w-5 h-5 text-kpi-error" />} glowClass="" colorClass="bg-kpi-error/15" subtitle={`${total > 0 ? ((detractors / total) * 100).toFixed(1) : 0}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Evolução do NPS</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={npsOverTime}>
                <defs>
                  <linearGradient id="npsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                <XAxis dataKey="day" stroke="hsl(215, 20%, 65%)" fontSize={12} />
                <YAxis stroke="hsl(215, 20%, 65%)" fontSize={12} />
                <Tooltip contentStyle={{ background: 'hsl(220, 39%, 10%)', border: '1px solid hsl(220, 20%, 18%)', borderRadius: '8px', color: '#f1f5f9' }} />
                <Area type="monotone" dataKey="nps" stroke="hsl(160, 84%, 39%)" fill="url(#npsGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição de Notas</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                <XAxis dataKey="score" stroke="hsl(215, 20%, 65%)" fontSize={12} />
                <YAxis stroke="hsl(215, 20%, 65%)" fontSize={12} />
                <Tooltip contentStyle={{ background: 'hsl(220, 39%, 10%)', border: '1px solid hsl(220, 20%, 18%)', borderRadius: '8px', color: '#f1f5f9' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="hsl(199, 89%, 60%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

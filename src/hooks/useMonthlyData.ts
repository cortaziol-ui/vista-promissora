import { useMemo } from 'react';
import { useSalesData, type Cliente, type VendedorStats } from '@/contexts/SalesDataContext';
import { parseMonthFromData, countWeekdays } from '@/lib/dateUtils';
import { useMonthlyGoals } from '@/hooks/useMonthlyGoals';

export interface MonthlyData {
  filteredClientes: Cliente[];
  faturamento: number;
  totalVendas: number;
  ticketMedio: number;
  pctMeta: number;
  projecao: number;
  vendedorStats: VendedorStats[];
  dailyEvolution: { dia: string; dataFull: string; vendas: number }[];
  ticketPorDia: { dia: string; ticketMedio: number }[];
  metaEmpresaVendas: number;
  metaComercialVendas: number;
}

export function useMonthlyData(month: string): MonthlyData {
  const { clientes, vendedores } = useSalesData();
  const { metaEmpresaVendas, metaComercialVendas, vendorGoals } = useMonthlyGoals(month);

  const filteredClientes = useMemo(() => {
    return clientes.filter(c => {
      const m = parseMonthFromData(c.data);
      return m === month;
    });
  }, [clientes, month]);

  const faturamento = useMemo(() => filteredClientes.reduce((s, c) => s + (c.entrada || 0), 0), [filteredClientes]);
  const totalVendas = filteredClientes.length;
  const ticketMedio = useMemo(() => totalVendas > 0 ? faturamento / totalVendas : 0, [faturamento, totalVendas]);
  const pctMeta = useMemo(() => metaEmpresaVendas > 0 ? (totalVendas / metaEmpresaVendas) * 100 : 0, [totalVendas, metaEmpresaVendas]);

  const projecao = useMemo(() => {
    const now = new Date();
    const [selYear, selMonthStr] = month.split('-').map(Number);
    const lastDayOfMonth = new Date(selYear, selMonthStr, 0).getDate();
    const weekdaysInMonth = countWeekdays(selYear, selMonthStr, 1, lastDayOfMonth);

    const isCurrentMonth = selYear === now.getFullYear() && selMonthStr === (now.getMonth() + 1);

    let weekdaysPassed: number;
    if (isCurrentMonth) {
      weekdaysPassed = countWeekdays(selYear, selMonthStr, 1, now.getDate());
    } else {
      const daysWithData = filteredClientes
        .map(c => {
          const parts = c.data.split('/');
          return parts.length === 3 ? parseInt(parts[0], 10) : 0;
        })
        .filter(d => d > 0);
      const lastDataDay = daysWithData.length > 0 ? Math.max(...daysWithData) : lastDayOfMonth;
      weekdaysPassed = countWeekdays(selYear, selMonthStr, 1, lastDataDay);
    }

    if (weekdaysPassed <= 0) return 0;
    const ritmo = totalVendas / weekdaysPassed;
    return ritmo * weekdaysInMonth;
  }, [filteredClientes, totalVendas, month]);

  const vendedorStats = useMemo<VendedorStats[]>(() => {
    const now = new Date();
    const [selYear, selMonthStr] = month.split('-').map(Number);
    const lastDayOfMonth = new Date(selYear, selMonthStr, 0).getDate();
    const weekdaysInMonth = countWeekdays(selYear, selMonthStr, 1, lastDayOfMonth);
    const isCurrentMonth = selYear === now.getFullYear() && selMonthStr === (now.getMonth() + 1);

    return vendedores.map(v => {
      const cv = filteredClientes.filter(c => c.vendedor === v.nome);
      const fat = cv.reduce((s, c) => s + (c.entrada || 0), 0);
      const vendas = cv.length;
      const ticket = vendas > 0 ? fat / vendas : 0;

      const vendorMeta = vendorGoals.get(v.id) ?? v.meta;
      const pct = vendorMeta > 0 ? (vendas / vendorMeta) * 100 : 0;
      const faltam = Math.max(0, vendorMeta - vendas);

      let weekdaysPassed: number;
      if (isCurrentMonth) {
        weekdaysPassed = countWeekdays(selYear, selMonthStr, 1, now.getDate());
      } else {
        const daysWithData = cv
          .map(c => {
            const parts = c.data.split('/');
            return parts.length === 3 ? parseInt(parts[0], 10) : 0;
          })
          .filter(d => d > 0);
        const lastDataDay = daysWithData.length > 0 ? Math.max(...daysWithData) : lastDayOfMonth;
        weekdaysPassed = countWeekdays(selYear, selMonthStr, 1, lastDataDay);
      }

      const ritmo = weekdaysPassed > 0 ? vendas / weekdaysPassed : 0;
      const projecaoVendas = Math.round(ritmo * weekdaysInMonth);
      const dentroProjecao = projecaoVendas >= vendorMeta;

      return { vendedor: v, faturamento: fat, vendas, ticketMedio: ticket, pctMeta: pct, faltam, projecaoVendas, dentroProjecao };
    }).sort((a, b) => b.vendas - a.vendas);
  }, [filteredClientes, vendedores, month, vendorGoals]);

  const dailyEvolution = useMemo(() => {
    const byDay: Record<string, { vendas: number; dataFull: string }> = {};
    filteredClientes.forEach(c => {
      const day = c.data?.split('/')[0] || '00';
      if (!byDay[day]) byDay[day] = { vendas: 0, dataFull: c.data };
      byDay[day].vendas++;
    });
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, d]) => ({ dia, dataFull: d.dataFull, vendas: d.vendas }));
  }, [filteredClientes]);

  const ticketPorDia = useMemo(() => {
    const byDay: Record<string, { total: number; count: number }> = {};
    filteredClientes.forEach(c => {
      const day = c.data?.split('/')[0] || '00';
      if (!byDay[day]) byDay[day] = { total: 0, count: 0 };
      byDay[day].total += (c.entrada || 0);
      byDay[day].count++;
    });
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, d]) => ({ dia, ticketMedio: d.count > 0 ? d.total / d.count : 0 }));
  }, [filteredClientes]);

  return {
    filteredClientes,
    faturamento,
    totalVendas,
    ticketMedio,
    pctMeta,
    projecao,
    vendedorStats,
    dailyEvolution,
    ticketPorDia,
    metaEmpresaVendas,
    metaComercialVendas,
  };
}

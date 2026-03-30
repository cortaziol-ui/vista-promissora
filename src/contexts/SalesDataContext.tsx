import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Parcela {
  valor: number;
  status: 'PAGO' | 'AGUARDANDO' | 'CANCELADO';
  dataPagamento?: string;
}

export interface Cliente {
  id: number;
  data: string;
  nome: string;
  cpf: string;
  nascimento: string;
  email: string;
  telefone: string;
  servico: 'LIMPA NOME' | 'RATING' | 'OUTROS';
  vendedor: string;
  entrada: number;
  parcela1: Parcela;
  parcela2: Parcela;
  situacao: string;
  valorTotal: number;
}

export interface Vendedor {
  id: number;
  nome: string;
  cargo: string;
  meta: number;
  avatar: string;
}

export interface VendedorStats {
  vendedor: Vendedor;
  faturamento: number;
  vendas: number;
  ticketMedio: number;
  pctMeta: number;
  faltam: number;
  projecaoVendas: number;
  dentroProjecao: boolean;
}

interface SalesDataContextType {
  metaMensalGlobal: number;
  setMetaMensalGlobal: (v: number) => void;
  metaEmpresaVendas: number;
  setMetaEmpresaVendas: (v: number) => void;
  metaComercialVendas: number;
  setMetaComercialVendas: (v: number) => void;
  selectedMonth: string;
  setSelectedMonth: (v: string) => void;
  vendedores: Vendedor[];
  addVendedor: (v: Omit<Vendedor, 'id'>) => Promise<Vendedor | null>;
  updateVendedor: (id: number, partial: Partial<Vendedor>) => void;
  deleteVendedor: (id: number) => Promise<boolean>;
  clientes: Cliente[];
  filteredClientes: Cliente[];
  addCliente: (c: Omit<Cliente, 'id'>) => void;
  updateCliente: (id: number, c: Partial<Cliente>) => void;
  deleteCliente: (id: number) => void;
  faturamento: number;
  totalVendas: number;
  ticketMedio: number;
  pctMeta: number;
  projecao: number;
  vendedorStats: VendedorStats[];
  dailyEvolution: { dia: string; dataFull: string; faturamento: number }[];
  ticketPorDia: { dia: string; ticketMedio: number }[];
  loading: boolean;
}

// Map DB row to Cliente interface
function mapRowToCliente(row: any): Cliente {
  return {
    id: row.id,
    data: row.data,
    nome: row.nome,
    cpf: row.cpf || '',
    nascimento: row.nascimento || '',
    email: row.email || '',
    telefone: row.telefone || '',
    servico: row.servico as Cliente['servico'],
    vendedor: row.vendedor,
    entrada: Number(row.entrada),
    parcela1: {
      valor: Number(row.parcela1_valor),
      status: row.parcela1_status as Parcela['status'],
      dataPagamento: row.parcela1_data_pagamento || undefined,
    },
    parcela2: {
      valor: Number(row.parcela2_valor),
      status: row.parcela2_status as Parcela['status'],
      dataPagamento: row.parcela2_data_pagamento || undefined,
    },
    situacao: row.situacao,
    valorTotal: Number(row.valor_total),
  };
}

function mapClienteToRow(c: Partial<Cliente>) {
  const row: Record<string, any> = {};
  if (c.data !== undefined) row.data = c.data;
  if (c.nome !== undefined) row.nome = c.nome;
  if (c.cpf !== undefined) row.cpf = c.cpf;
  if (c.nascimento !== undefined) row.nascimento = c.nascimento;
  if (c.email !== undefined) row.email = c.email;
  if (c.telefone !== undefined) row.telefone = c.telefone;
  if (c.servico !== undefined) row.servico = c.servico;
  if (c.vendedor !== undefined) row.vendedor = c.vendedor;
  if (c.entrada !== undefined) row.entrada = c.entrada;
  if (c.parcela1 !== undefined) {
    row.parcela1_valor = c.parcela1.valor;
    row.parcela1_status = c.parcela1.status;
    row.parcela1_data_pagamento = c.parcela1.dataPagamento || null;
  }
  if (c.parcela2 !== undefined) {
    row.parcela2_valor = c.parcela2.valor;
    row.parcela2_status = c.parcela2.status;
    row.parcela2_data_pagamento = c.parcela2.dataPagamento || null;
  }
  if (c.situacao !== undefined) row.situacao = c.situacao;
  if (c.valorTotal !== undefined) row.valor_total = c.valorTotal;
  return row;
}

/** Parse "DD/MM/YYYY" into "YYYY-MM" */
function parseMonthFromData(data: string): string | null {
  if (!data) return null;
  const parts = data.split('/');
  if (parts.length !== 3) return null;
  const [, mm, yyyy] = parts;
  if (!yyyy || !mm) return null;
  return `${yyyy}-${mm.padStart(2, '0')}`;
}

/** Count weekdays (Mon-Fri) from fromDay to toDay (inclusive) in a given year/month (1-indexed month) */
function countWeekdays(year: number, month: number, fromDay: number, toDay: number): number {
  let count = 0;
  for (let d = fromDay; d <= toDay; d++) {
    const dayOfWeek = new Date(year, month - 1, d).getDay(); // 0=Sun, 6=Sat
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
  }
  return count;
}

/** Get current month as "YYYY-MM" */
function getCurrentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

const SalesDataContext = createContext<SalesDataContextType | null>(null);

export function SalesDataProvider({ children }: { children: ReactNode }) {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [metaMensalGlobal, setMetaMensalGlobalState] = useState<number>(450000);
  const [metaEmpresaVendas, setMetaEmpresaVendasState] = useState<number>(30);
  const [metaComercialVendas, setMetaComercialVendasState] = useState<number>(30);
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [loading, setLoading] = useState(true);

  // Helper to fetch all clientes
  const fetchClientes = useCallback(async () => {
    const { data } = await supabase.from('clientes').select('*').order('id');
    if (data) {
      setClientes(data.map(mapRowToCliente));
    }
  }, []);

  // Fetch initial data
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [vendRes, cliRes, settRes, metaEmpRes, metaComRes] = await Promise.all([
          supabase.from('vendedores').select('*').order('id'),
          supabase.from('clientes').select('*').order('id'),
          supabase.from('company_settings').select('*').eq('key', 'meta_mensal').maybeSingle(),
          supabase.from('company_settings').select('*').eq('key', 'meta_empresa_vendas').maybeSingle(),
          supabase.from('company_settings').select('*').eq('key', 'meta_comercial_vendas').maybeSingle(),
        ]);

        if (vendRes.data) {
          setVendedores(vendRes.data.map(v => ({
            id: v.id,
            nome: v.nome,
            cargo: v.cargo,
            meta: Number(v.meta),
            avatar: v.avatar,
          })));
        }

        if (cliRes.data) {
          setClientes(cliRes.data.map(mapRowToCliente));
        }

        if (settRes.data) {
          setMetaMensalGlobalState(Number(settRes.data.value) || 450000);
        }

        if (metaEmpRes.data) {
          setMetaEmpresaVendasState(Number(metaEmpRes.data.value) || 30);
        }

        if (metaComRes.data) {
          setMetaComercialVendasState(Number(metaComRes.data.value) || 30);
        }
      } catch (e) {
        console.error("[SalesDataProvider] Error fetching data:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  // Supabase realtime subscription for clientes
  useEffect(() => {
    const channel = supabase
      .channel('clientes-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'clientes' },
        () => { fetchClientes(); }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'clientes' },
        () => { fetchClientes(); }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'clientes' },
        () => { fetchClientes(); }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[SalesDataProvider] Realtime subscription error');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchClientes]);

  const setMetaMensalGlobal = useCallback(async (v: number) => {
    setMetaMensalGlobalState(v);
    await supabase
      .from('company_settings')
      .update({ value: v as any })
      .eq('key', 'meta_mensal');
  }, []);

  const setMetaEmpresaVendas = useCallback(async (v: number) => {
    setMetaEmpresaVendasState(v);
    await supabase
      .from('company_settings')
      .upsert({ key: 'meta_empresa_vendas', value: v as any } as any, { onConflict: 'key' });
  }, []);

  const setMetaComercialVendas = useCallback(async (v: number) => {
    setMetaComercialVendasState(v);
    await supabase
      .from('company_settings')
      .upsert({ key: 'meta_comercial_vendas', value: v as any } as any, { onConflict: 'key' });
  }, []);

  const addVendedor = useCallback(async (v: Omit<Vendedor, 'id'>): Promise<Vendedor | null> => {
    const { data, error } = await supabase.from('vendedores').insert({
      nome: v.nome,
      cargo: v.cargo,
      meta: v.meta,
      avatar: v.avatar,
    } as any).select().single();
    if (data && !error) {
      const newV: Vendedor = { id: data.id, nome: data.nome, cargo: data.cargo, meta: Number(data.meta), avatar: data.avatar };
      setVendedores(prev => [...prev, newV]);
      return newV;
    }
    return null;
  }, []);

  const deleteVendedor = useCallback(async (id: number): Promise<boolean> => {
    const vendedor = vendedores.find(v => v.id === id);
    if (vendedor) {
      const hasClientes = clientes.some(c => c.vendedor === vendedor.nome);
      if (hasClientes) return false; // Has linked clients, caller should warn user
    }
    setVendedores(prev => prev.filter(v => v.id !== id));
    await supabase.from('vendedores').delete().eq('id', id);
    return true;
  }, [vendedores, clientes]);

  const updateVendedor = useCallback(async (id: number, partial: Partial<Vendedor>) => {
    setVendedores(prev => prev.map(v => v.id === id ? { ...v, ...partial } : v));
    const dbPartial: Record<string, any> = {};
    if (partial.nome !== undefined) dbPartial.nome = partial.nome;
    if (partial.cargo !== undefined) dbPartial.cargo = partial.cargo;
    if (partial.meta !== undefined) dbPartial.meta = partial.meta;
    if (partial.avatar !== undefined) dbPartial.avatar = partial.avatar;
    await supabase.from('vendedores').update(dbPartial).eq('id', id);
  }, []);

  const addCliente = useCallback(async (c: Omit<Cliente, 'id'>) => {
    const row = mapClienteToRow(c as Partial<Cliente>);
    // Ensure required fields
    row.data = c.data;
    row.nome = c.nome;
    row.vendedor = c.vendedor;
    row.servico = c.servico;
    row.entrada = c.entrada;
    row.parcela1_valor = c.parcela1.valor;
    row.parcela1_status = c.parcela1.status;
    row.parcela1_data_pagamento = c.parcela1.dataPagamento || null;
    row.parcela2_valor = c.parcela2.valor;
    row.parcela2_status = c.parcela2.status;
    row.parcela2_data_pagamento = c.parcela2.dataPagamento || null;
    row.situacao = c.situacao;
    row.valor_total = c.valorTotal;

    const { data, error } = await supabase.from('clientes').insert(row as any).select().single();
    if (data && !error) {
      setClientes(prev => [...prev, mapRowToCliente(data)]);
    }
  }, []);

  const updateCliente = useCallback(async (id: number, partial: Partial<Cliente>) => {
    setClientes(prev => prev.map(c => c.id === id ? { ...c, ...partial } : c));
    const row = mapClienteToRow(partial);
    await supabase.from('clientes').update(row).eq('id', id);
  }, []);

  const deleteCliente = useCallback(async (id: number) => {
    setClientes(prev => prev.filter(c => c.id !== id));
    await supabase.from('clientes').delete().eq('id', id);
  }, []);

  // Filter clientes by selectedMonth
  const filteredClientes = useMemo(() => {
    return clientes.filter(c => {
      const month = parseMonthFromData(c.data);
      return month === selectedMonth;
    });
  }, [clientes, selectedMonth]);

  // All computed values use filteredClientes
  const faturamento = useMemo(() => filteredClientes.reduce((s, c) => s + (c.entrada || 0), 0), [filteredClientes]);
  const totalVendas = filteredClientes.length;
  const ticketMedio = useMemo(() => totalVendas > 0 ? faturamento / totalVendas : 0, [faturamento, totalVendas]);

  // Global pctMeta is now sales-count based against metaEmpresaVendas
  const pctMeta = useMemo(() => metaEmpresaVendas > 0 ? (totalVendas / metaEmpresaVendas) * 100 : 0, [totalVendas, metaEmpresaVendas]);

  const projecao = useMemo(() => {
    const now = new Date();
    const [selYear, selMonthStr] = selectedMonth.split('-').map(Number);
    const lastDayOfMonth = new Date(selYear, selMonthStr, 0).getDate();
    const weekdaysInMonth = countWeekdays(selYear, selMonthStr, 1, lastDayOfMonth);

    const isCurrentMonth = selYear === now.getFullYear() && selMonthStr === (now.getMonth() + 1);

    let weekdaysPassed: number;
    if (isCurrentMonth) {
      weekdaysPassed = countWeekdays(selYear, selMonthStr, 1, now.getDate());
    } else {
      // For past/future months, use the last day that has data, or the full month
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
  }, [filteredClientes, totalVendas, selectedMonth]);

  const vendedorStats = useMemo<VendedorStats[]>(() => {
    const now = new Date();
    const [selYear, selMonthStr] = selectedMonth.split('-').map(Number);
    const lastDayOfMonth = new Date(selYear, selMonthStr, 0).getDate();
    const weekdaysInMonth = countWeekdays(selYear, selMonthStr, 1, lastDayOfMonth);
    const isCurrentMonth = selYear === now.getFullYear() && selMonthStr === (now.getMonth() + 1);

    return vendedores.map(v => {
      const cv = filteredClientes.filter(c => c.vendedor === v.nome);
      const fat = cv.reduce((s, c) => s + (c.entrada || 0), 0);
      const vendas = cv.length;
      const ticket = vendas > 0 ? fat / vendas : 0;

      // Meta is now number of sales
      const pct = v.meta > 0 ? (vendas / v.meta) * 100 : 0;
      const faltam = Math.max(0, v.meta - vendas);

      // Per-vendor projection using business days
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
      const dentroProjecao = projecaoVendas >= v.meta;

      return { vendedor: v, faturamento: fat, vendas, ticketMedio: ticket, pctMeta: pct, faltam, projecaoVendas, dentroProjecao };
    }).sort((a, b) => b.vendas - a.vendas);
  }, [filteredClientes, vendedores, selectedMonth]);

  const dailyEvolution = useMemo(() => {
    const byDay: Record<string, { fat: number; dataFull: string }> = {};
    filteredClientes.forEach(c => {
      const day = c.data?.split('/')[0] || '00';
      if (!byDay[day]) byDay[day] = { fat: 0, dataFull: c.data };
      byDay[day].fat += (c.entrada || 0);
    });
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, d]) => ({ dia, dataFull: d.dataFull, faturamento: d.fat }));
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

  return (
    <SalesDataContext.Provider value={{
      metaMensalGlobal, setMetaMensalGlobal,
      metaEmpresaVendas, setMetaEmpresaVendas,
      metaComercialVendas, setMetaComercialVendas,
      selectedMonth, setSelectedMonth,
      vendedores, addVendedor, updateVendedor, deleteVendedor,
      clientes, filteredClientes,
      addCliente, updateCliente, deleteCliente,
      faturamento, totalVendas, ticketMedio, pctMeta, projecao,
      vendedorStats, dailyEvolution, ticketPorDia, loading,
    }}>
      {children}
    </SalesDataContext.Provider>
  );
}

export function useSalesData() {
  const ctx = useContext(SalesDataContext);
  if (!ctx) throw new Error('useSalesData must be used within SalesDataProvider');
  return ctx;
}

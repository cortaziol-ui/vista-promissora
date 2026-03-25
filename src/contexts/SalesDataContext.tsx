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
}

interface SalesDataContextType {
  metaMensalGlobal: number;
  setMetaMensalGlobal: (v: number) => void;
  vendedores: Vendedor[];
  updateVendedor: (id: number, partial: Partial<Vendedor>) => void;
  clientes: Cliente[];
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

const SalesDataContext = createContext<SalesDataContextType | null>(null);

export function SalesDataProvider({ children }: { children: ReactNode }) {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [metaMensalGlobal, setMetaMensalGlobalState] = useState<number>(450000);
  const [loading, setLoading] = useState(true);

  // Fetch initial data
  useEffect(() => {
    const fetchAll = async () => {
      const [vendRes, cliRes, settRes] = await Promise.all([
        supabase.from('vendedores').select('*').order('id'),
        supabase.from('clientes').select('*').order('id'),
        supabase.from('company_settings').select('*').eq('key', 'meta_mensal').single(),
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

      setLoading(false);
    };

    fetchAll();
  }, []);

  const setMetaMensalGlobal = useCallback(async (v: number) => {
    setMetaMensalGlobalState(v);
    await supabase
      .from('company_settings')
      .update({ value: v as any })
      .eq('key', 'meta_mensal');
  }, []);

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

    const { data, error } = await supabase.from('clientes').insert(row).select().single();
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

  const faturamento = useMemo(() => clientes.reduce((s, c) => s + (c.entrada || 0), 0), [clientes]);
  const totalVendas = clientes.length;
  const ticketMedio = useMemo(() => totalVendas > 0 ? faturamento / totalVendas : 0, [faturamento, totalVendas]);
  const pctMeta = useMemo(() => (faturamento / metaMensalGlobal) * 100, [faturamento, metaMensalGlobal]);

  const projecao = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    return currentDay > 0 ? (faturamento / currentDay) * daysInMonth : 0;
  }, [faturamento]);

  const vendedorStats = useMemo<VendedorStats[]>(() => {
    return vendedores.map(v => {
      const cv = clientes.filter(c => c.vendedor === v.nome);
      const fat = cv.reduce((s, c) => s + (c.entrada || 0), 0);
      const vendas = cv.length;
      const ticket = vendas > 0 ? fat / vendas : 0;
      const pct = v.meta > 0 ? (fat / v.meta) * 100 : 0;
      const faltam = Math.max(0, v.meta - fat);
      return { vendedor: v, faturamento: fat, vendas, ticketMedio: ticket, pctMeta: pct, faltam };
    }).sort((a, b) => b.faturamento - a.faturamento);
  }, [clientes, vendedores]);

  const dailyEvolution = useMemo(() => {
    const byDay: Record<string, { fat: number; dataFull: string }> = {};
    clientes.forEach(c => {
      const day = c.data?.split('/')[0] || '00';
      if (!byDay[day]) byDay[day] = { fat: 0, dataFull: c.data };
      byDay[day].fat += (c.entrada || 0);
    });
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, d]) => ({ dia, dataFull: d.dataFull, faturamento: d.fat }));
  }, [clientes]);

  const ticketPorDia = useMemo(() => {
    const byDay: Record<string, { total: number; count: number }> = {};
    clientes.forEach(c => {
      const day = c.data?.split('/')[0] || '00';
      if (!byDay[day]) byDay[day] = { total: 0, count: 0 };
      byDay[day].total += (c.entrada || 0);
      byDay[day].count++;
    });
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, d]) => ({ dia, ticketMedio: d.count > 0 ? d.total / d.count : 0 }));
  }, [clientes]);

  return (
    <SalesDataContext.Provider value={{
      metaMensalGlobal, setMetaMensalGlobal, vendedores, updateVendedor, clientes,
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

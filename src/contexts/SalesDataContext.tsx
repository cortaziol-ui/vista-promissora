import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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
  servico: 'LIMPA NOME' | 'RATING' | 'LIMPA NOME + RATING' | 'OUTROS';
  vendedor: string;
  entrada: number;
  parcela1: Parcela;
  parcela2: Parcela;
  situacao: string;
  valorTotal: number;
  link?: string;
}

export interface Vendedor {
  id: number;
  nome: string;
  cargo: string;
  meta: number;
  avatar: string;
  aniversario?: string;
  foto?: string;
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
  vendedores: Vendedor[];
  addVendedor: (v: Omit<Vendedor, 'id'>) => Promise<Vendedor | null>;
  updateVendedor: (id: number, partial: Partial<Vendedor>) => void;
  deleteVendedor: (id: number) => Promise<boolean>;
  clientes: Cliente[];
  addCliente: (c: Omit<Cliente, 'id'>) => void;
  updateCliente: (id: number, c: Partial<Cliente>) => void;
  bulkUpdateClientes: (ids: number[], c: Partial<Cliente>) => Promise<void>;
  deleteCliente: (id: number) => void;
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
    link: row.link || undefined,
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
  if (c.link !== undefined) row.link = c.link || null;
  return row;
}

const SalesDataContext = createContext<SalesDataContextType | null>(null);

export function SalesDataProvider({ children }: { children: ReactNode }) {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [metaMensalGlobal, setMetaMensalGlobalState] = useState<number>(450000);
  const [metaEmpresaVendas, setMetaEmpresaVendasState] = useState<number>(30);
  const [metaComercialVendas, setMetaComercialVendasState] = useState<number>(30);
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
          setVendedores(vendRes.data.map((v: any) => ({
            id: v.id,
            nome: v.nome,
            cargo: v.cargo,
            meta: Number(v.meta),
            avatar: v.avatar,
            aniversario: v.aniversario || undefined,
            foto: v.foto || undefined,
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
      ...(v.aniversario ? { aniversario: v.aniversario } : {}),
      ...(v.foto ? { foto: v.foto } : {}),
    } as any).select().single();
    if (data && !error) {
      const d = data as any;
      const newV: Vendedor = { id: d.id, nome: d.nome, cargo: d.cargo, meta: Number(d.meta), avatar: d.avatar, aniversario: d.aniversario, foto: d.foto };
      setVendedores(prev => [...prev, newV]);
      return newV;
    }
    return null;
  }, []);

  const deleteVendedor = useCallback(async (id: number): Promise<boolean> => {
    const vendedor = vendedores.find(v => v.id === id);
    if (vendedor) {
      const hasClientes = clientes.some(c => c.vendedor === vendedor.nome);
      if (hasClientes) return false;
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
    if (partial.aniversario !== undefined) dbPartial.aniversario = partial.aniversario;
    if (partial.foto !== undefined) dbPartial.foto = partial.foto;
    await supabase.from('vendedores').update(dbPartial as any).eq('id', id);
  }, []);

  const addCliente = useCallback(async (c: Omit<Cliente, 'id'>) => {
    const row = mapClienteToRow(c as Partial<Cliente>);
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

  const bulkUpdateClientes = useCallback(async (ids: number[], partial: Partial<Cliente>) => {
    setClientes(prev => prev.map(c => ids.includes(c.id) ? { ...c, ...partial } : c));
    const row = mapClienteToRow(partial);
    await supabase.from('clientes').update(row).in('id', ids);
  }, []);

  const deleteCliente = useCallback(async (id: number) => {
    setClientes(prev => prev.filter(c => c.id !== id));
    await supabase.from('clientes').delete().eq('id', id);
  }, []);

  return (
    <SalesDataContext.Provider value={{
      metaMensalGlobal, setMetaMensalGlobal,
      metaEmpresaVendas, setMetaEmpresaVendas,
      metaComercialVendas, setMetaComercialVendas,
      vendedores, addVendedor, updateVendedor, deleteVendedor,
      clientes,
      addCliente, updateCliente, bulkUpdateClientes, deleteCliente,
      loading,
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

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSalesData } from '@/contexts/SalesDataContext';

interface MonthlyGoals {
  metaEmpresaVendas: number;
  metaComercialVendas: number;
  metaMensalGlobal: number;
  vendorGoals: Map<number, number>;
  loading: boolean;
  setMetaEmpresaVendas: (value: number) => Promise<void>;
  setMetaComercialVendas: (value: number) => Promise<void>;
  setMetaMensalGlobal: (value: number) => Promise<void>;
  setVendorGoal: (vendedorId: number, value: number) => Promise<void>;
}

export function useMonthlyGoals(month: string): MonthlyGoals {
  const {
    metaEmpresaVendas: globalMetaEmpresa,
    metaComercialVendas: globalMetaComercial,
    metaMensalGlobal: globalMetaMensal,
    vendedores,
  } = useSalesData();

  const [metaEmpresaVendas, setMetaEmpresaState] = useState(globalMetaEmpresa);
  const [metaComercialVendas, setMetaComercialState] = useState(globalMetaComercial);
  const [metaMensalGlobal, setMetaMensalState] = useState(globalMetaMensal);
  const [vendorGoals, setVendorGoals] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(true);

  // Fetch month-specific goals
  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);

      // Fetch company goals for this month
      const { data: companyGoals } = await (supabase.from as any)('monthly_goals')
        .select('*')
        .eq('month', month);

      // Fetch vendor goals for this month
      const { data: vGoals } = await (supabase.from as any)('vendor_monthly_goals')
        .select('*')
        .eq('month', month);

      if (cancelled) return;

      // Apply company goals (fallback to global defaults)
      let empresa = globalMetaEmpresa;
      let comercial = globalMetaComercial;
      let mensal = globalMetaMensal;

      if (companyGoals) {
        for (const row of companyGoals) {
          if (row.key === 'meta_empresa_vendas') empresa = Number(row.value);
          if (row.key === 'meta_comercial_vendas') comercial = Number(row.value);
          if (row.key === 'meta_mensal') mensal = Number(row.value);
        }
      }

      setMetaEmpresaState(empresa);
      setMetaComercialState(comercial);
      setMetaMensalState(mensal);

      // Apply vendor goals (fallback to vendedores.meta)
      const map = new Map<number, number>();
      vendedores.forEach(v => map.set(v.id, v.meta));
      if (vGoals) {
        for (const row of vGoals) {
          map.set(row.vendedor_id, Number(row.meta));
        }
      }
      setVendorGoals(map);
      setLoading(false);
    }

    fetch();
    return () => { cancelled = true; };
  }, [month, globalMetaEmpresa, globalMetaComercial, globalMetaMensal, vendedores]);

  const setMetaEmpresaVendas = useCallback(async (value: number) => {
    setMetaEmpresaState(value);
    await (supabase.from as any)('monthly_goals')
      .upsert({ month, key: 'meta_empresa_vendas', value }, { onConflict: 'month,key' });
  }, [month]);

  const setMetaComercialVendas = useCallback(async (value: number) => {
    setMetaComercialState(value);
    await (supabase.from as any)('monthly_goals')
      .upsert({ month, key: 'meta_comercial_vendas', value }, { onConflict: 'month,key' });
  }, [month]);

  const setMetaMensalGlobalFn = useCallback(async (value: number) => {
    setMetaMensalState(value);
    await (supabase.from as any)('monthly_goals')
      .upsert({ month, key: 'meta_mensal', value }, { onConflict: 'month,key' });
  }, [month]);

  const setVendorGoal = useCallback(async (vendedorId: number, value: number) => {
    setVendorGoals(prev => {
      const next = new Map(prev);
      next.set(vendedorId, value);
      return next;
    });
    await (supabase.from as any)('vendor_monthly_goals')
      .upsert({ month, vendedor_id: vendedorId, meta: value }, { onConflict: 'month,vendedor_id' });
  }, [month]);

  return {
    metaEmpresaVendas,
    metaComercialVendas,
    metaMensalGlobal,
    vendorGoals,
    loading,
    setMetaEmpresaVendas,
    setMetaComercialVendas,
    setMetaMensalGlobal: setMetaMensalGlobalFn,
    setVendorGoal,
  };
}

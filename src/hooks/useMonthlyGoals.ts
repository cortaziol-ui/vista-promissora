import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSalesData } from '@/contexts/SalesDataContext';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';

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
  const { activeAccountId, accounts } = useTenant();
  const { user } = useAuth();
  const {
    metaEmpresaVendas: globalMetaEmpresa,
    metaComercialVendas: globalMetaComercial,
    metaMensalGlobal: globalMetaMensal,
    vendedores,
  } = useSalesData();

  const isConsolidatedSeller = user?.role === 'seller' && accounts.length > 1 && !activeAccountId;
  const accountIds = accounts.map(a => a.id);
  const accountIdsKey = accountIds.join(',');

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

      // Build query scope: single account or consolidated (all user accounts)
      const scope = isConsolidatedSeller
        ? { col: 'account_id', op: 'in' as const, val: accountIds }
        : { col: 'account_id', op: 'eq' as const, val: activeAccountId };

      const baseCompanyQuery = (supabase.from as any)('monthly_goals').select('*').eq('month', month);
      const baseVendorQuery = (supabase.from as any)('vendor_monthly_goals').select('*').eq('month', month);

      const companyQuery = scope.op === 'in'
        ? baseCompanyQuery.in(scope.col, scope.val)
        : baseCompanyQuery.eq(scope.col, scope.val);
      const vendorQuery = scope.op === 'in'
        ? baseVendorQuery.in(scope.col, scope.val)
        : baseVendorQuery.eq(scope.col, scope.val);

      const [{ data: companyGoals }, { data: vGoals }] = await Promise.all([companyQuery, vendorQuery]);

      if (cancelled) return;

      // Apply company goals
      let empresa = globalMetaEmpresa;
      let comercial = globalMetaComercial;
      let mensal = globalMetaMensal;

      if (companyGoals && companyGoals.length > 0) {
        if (isConsolidatedSeller) {
          // Sum overrides per account; if an account has no override for a key, fall back to the global default for that account.
          // Simpler approach: sum whatever monthly_goals rows exist; missing rows just contribute the global default.
          const overridesByAccount = new Map<string, { empresa?: number; comercial?: number; mensal?: number }>();
          for (const row of companyGoals as any[]) {
            const o = overridesByAccount.get(row.account_id) || {};
            if (row.key === 'meta_empresa_vendas') o.empresa = Number(row.value);
            if (row.key === 'meta_comercial_vendas') o.comercial = Number(row.value);
            if (row.key === 'meta_mensal') o.mensal = Number(row.value);
            overridesByAccount.set(row.account_id, o);
          }
          // For each account, take override or fallback to a per-account share of the global aggregate.
          // Since globalMetaEmpresa already represents the consolidated default sum, distribute per account.
          const perAccountEmpresa = globalMetaEmpresa / Math.max(1, accountIds.length);
          const perAccountComercial = globalMetaComercial / Math.max(1, accountIds.length);
          const perAccountMensal = globalMetaMensal / Math.max(1, accountIds.length);
          let sumEmp = 0, sumCom = 0, sumMen = 0;
          for (const accId of accountIds) {
            const o = overridesByAccount.get(accId) || {};
            sumEmp += o.empresa ?? perAccountEmpresa;
            sumCom += o.comercial ?? perAccountComercial;
            sumMen += o.mensal ?? perAccountMensal;
          }
          empresa = sumEmp;
          comercial = sumCom;
          mensal = sumMen;
        } else {
          for (const row of companyGoals) {
            if (row.key === 'meta_empresa_vendas') empresa = Number(row.value);
            if (row.key === 'meta_comercial_vendas') comercial = Number(row.value);
            if (row.key === 'meta_mensal') mensal = Number(row.value);
          }
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
  }, [month, activeAccountId, globalMetaEmpresa, globalMetaComercial, globalMetaMensal, vendedores, isConsolidatedSeller, accountIdsKey]);

  const setMetaEmpresaVendas = useCallback(async (value: number) => {
    if (!activeAccountId) return; // No-op in consolidated mode (no single account to write to)
    setMetaEmpresaState(value);
    await (supabase.from as any)('monthly_goals')
      .upsert({ month, key: 'meta_empresa_vendas', value, account_id: activeAccountId }, { onConflict: 'account_id,month,key' });
  }, [month, activeAccountId]);

  const setMetaComercialVendas = useCallback(async (value: number) => {
    if (!activeAccountId) return;
    setMetaComercialState(value);
    await (supabase.from as any)('monthly_goals')
      .upsert({ month, key: 'meta_comercial_vendas', value, account_id: activeAccountId }, { onConflict: 'account_id,month,key' });
  }, [month, activeAccountId]);

  const setMetaMensalGlobalFn = useCallback(async (value: number) => {
    if (!activeAccountId) return;
    setMetaMensalState(value);
    await (supabase.from as any)('monthly_goals')
      .upsert({ month, key: 'meta_mensal', value, account_id: activeAccountId }, { onConflict: 'account_id,month,key' });
  }, [month, activeAccountId]);

  const setVendorGoal = useCallback(async (vendedorId: number, value: number) => {
    if (!activeAccountId) return;
    setVendorGoals(prev => {
      const next = new Map(prev);
      next.set(vendedorId, value);
      return next;
    });
    await (supabase.from as any)('vendor_monthly_goals')
      .upsert({ month, vendedor_id: vendedorId, meta: value, account_id: activeAccountId }, { onConflict: 'account_id,month,vendedor_id' });
  }, [month, activeAccountId]);

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

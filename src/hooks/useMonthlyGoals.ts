import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSalesData } from '@/contexts/SalesDataContext';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { type ServiceType, monthlyGoalsKey } from '@/lib/serviceTypes';

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

export function useMonthlyGoals(month: string, serviceType: ServiceType = 'GERAL'): MonthlyGoals {
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
  const empresaKey = monthlyGoalsKey(serviceType);

  const [metaEmpresaVendas, setMetaEmpresaState] = useState(serviceType === 'GERAL' ? globalMetaEmpresa : 0);
  const [metaComercialVendas, setMetaComercialState] = useState(globalMetaComercial);
  const [metaMensalGlobal, setMetaMensalState] = useState(globalMetaMensal);
  const [vendorGoals, setVendorGoals] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(true);

  // Fetch month-specific goals
  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);

      const scope = isConsolidatedSeller
        ? { col: 'account_id', op: 'in' as const, val: accountIds }
        : { col: 'account_id', op: 'eq' as const, val: activeAccountId };

      const baseCompanyQuery = (supabase.from as any)('monthly_goals').select('*').eq('month', month);
      // Para GERAL, buscamos LN + RT + GERAL — se houver registro explicito em GERAL
      // ele prevalece; caso contrario somamos LN + RT (Caio normalmente cadastra so por servico).
      const vendorServiceFilter = serviceType === 'GERAL' ? ['LIMPA_NOME', 'RATING', 'GERAL'] : [serviceType];
      const baseVendorQuery = (supabase.from as any)('vendor_monthly_goals')
        .select('*')
        .eq('month', month)
        .in('service_type', vendorServiceFilter);

      const companyQuery = scope.op === 'in'
        ? baseCompanyQuery.in(scope.col, scope.val)
        : baseCompanyQuery.eq(scope.col, scope.val);
      const vendorQuery = scope.op === 'in'
        ? baseVendorQuery.in(scope.col, scope.val)
        : baseVendorQuery.eq(scope.col, scope.val);

      const [{ data: companyGoals }, { data: vGoals }] = await Promise.all([companyQuery, vendorQuery]);

      if (cancelled) return;

      // Apply company goals
      let empresa = serviceType === 'GERAL' ? globalMetaEmpresa : 0;
      let comercial = globalMetaComercial;
      let mensal = globalMetaMensal;

      if (companyGoals && companyGoals.length > 0) {
        if (isConsolidatedSeller) {
          const overridesByAccount = new Map<string, { empresa?: number; comercial?: number; mensal?: number }>();
          for (const row of companyGoals as any[]) {
            const o = overridesByAccount.get(row.account_id) || {};
            if (row.key === empresaKey) o.empresa = Number(row.value);
            if (row.key === 'meta_comercial_vendas') o.comercial = Number(row.value);
            if (row.key === 'meta_mensal') o.mensal = Number(row.value);
            overridesByAccount.set(row.account_id, o);
          }
          const baseEmpresa = serviceType === 'GERAL' ? globalMetaEmpresa : 0;
          const perAccountEmpresa = baseEmpresa / Math.max(1, accountIds.length);
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
            if (row.key === empresaKey) empresa = Number(row.value);
            if (row.key === 'meta_comercial_vendas') comercial = Number(row.value);
            if (row.key === 'meta_mensal') mensal = Number(row.value);
          }
        }
      }

      setMetaEmpresaState(empresa);
      setMetaComercialState(comercial);
      setMetaMensalState(mensal);

      // Apply vendor goals.
      // - GERAL: prefere registro explicito em GERAL; senao soma LN + RT.
      //   Se nao tiver nenhum dos tres, fallback pra vendedores.meta legacy.
      // - LN ou RT: valor direto da linha. Sem fallback (zerado quando nao cadastrado).
      const map = new Map<number, number>();
      vendedores.forEach(v => map.set(v.id, serviceType === 'GERAL' ? v.meta : 0));
      if (vGoals && vGoals.length > 0) {
        if (serviceType === 'GERAL') {
          // Agrupa por vendedor: LN+RT vs GERAL explicito
          const lnRtByVendor = new Map<number, number>();
          const generalByVendor = new Map<number, number>();
          for (const row of vGoals) {
            const vid = row.vendedor_id;
            const meta = Number(row.meta);
            if (row.service_type === 'GERAL') {
              generalByVendor.set(vid, meta);
            } else {
              lnRtByVendor.set(vid, (lnRtByVendor.get(vid) ?? 0) + meta);
            }
          }
          // GERAL explicito ganha; senao usa LN+RT.
          const allVendorIds = new Set<number>([...lnRtByVendor.keys(), ...generalByVendor.keys()]);
          for (const vid of allVendorIds) {
            map.set(vid, generalByVendor.get(vid) ?? lnRtByVendor.get(vid) ?? 0);
          }
        } else {
          for (const row of vGoals) {
            map.set(row.vendedor_id, Number(row.meta));
          }
        }
      }
      setVendorGoals(map);
      setLoading(false);
    }

    fetch();
    return () => { cancelled = true; };
  }, [month, activeAccountId, globalMetaEmpresa, globalMetaComercial, globalMetaMensal, vendedores, isConsolidatedSeller, accountIdsKey, serviceType, empresaKey]);

  const setMetaEmpresaVendas = useCallback(async (value: number) => {
    if (!activeAccountId) return;
    setMetaEmpresaState(value);
    await (supabase.from as any)('monthly_goals')
      .upsert({ month, key: empresaKey, value, account_id: activeAccountId }, { onConflict: 'account_id,month,key' });
  }, [month, activeAccountId, empresaKey]);

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
      .upsert(
        { month, vendedor_id: vendedorId, meta: value, account_id: activeAccountId, service_type: serviceType },
        { onConflict: 'account_id,month,vendedor_id,service_type' }
      );
  }, [month, activeAccountId, serviceType]);

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

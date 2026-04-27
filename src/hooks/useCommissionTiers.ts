import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';

export interface CommissionTier {
  id: number;
  month: string;
  vendedor_id: number | null;
  faixa_nome: string;
  pct_meta: number;
  premiacao: number;
  sort_order: number;
}

export interface EnrichedTier extends CommissionTier {
  unlocked: boolean;
  vendasNecessarias: number;
}

interface UseCommissionTiersParams {
  vendedorId: number | null;
  month: string;
  vendas: number;
  meta: number;
}

interface UseCommissionTiersResult {
  tiers: EnrichedTier[];
  currentTier: EnrichedTier | null;
  totalPremiacao: number;
  nextTier: EnrichedTier | null;
  vendasParaProxima: number | null;
  loading: boolean;
}

export function useCommissionTiers({
  vendedorId,
  month,
  vendas,
  meta,
}: UseCommissionTiersParams): UseCommissionTiersResult {
  const { activeAccountId, accounts } = useTenant();
  const { user } = useAuth();
  const [rawTiers, setRawTiers] = useState<CommissionTier[]>([]);
  const [loading, setLoading] = useState(true);

  const isConsolidatedSeller = user?.role === 'seller' && accounts.length > 1 && !activeAccountId;
  const accountIds = accounts.map(a => a.id);
  const accountIdsKey = accountIds.join(',');

  useEffect(() => {
    let cancelled = false;

    async function fetchTiers() {
      if (!activeAccountId && !isConsolidatedSeller) return;
      setLoading(true);

      try {
        // In consolidated mode we need to know which account the vendedor belongs to,
        // so we can pull the right account's tiers (each tenant has its own pricing).
        let scopedAccountId: string | null = activeAccountId;
        if (isConsolidatedSeller && vendedorId !== null) {
          const { data: vendRow } = await supabase
            .from('vendedores')
            .select('account_id')
            .eq('id', vendedorId)
            .maybeSingle();
          scopedAccountId = (vendRow as any)?.account_id ?? null;
        }

        // First try vendedor-specific tiers
        if (vendedorId !== null && scopedAccountId) {
          const { data: specific } = await supabase
            .from('commission_tiers')
            .select('*')
            .eq('account_id', scopedAccountId)
            .eq('month', month)
            .eq('vendedor_id', vendedorId)
            .order('sort_order', { ascending: true });

          if (!cancelled && specific && specific.length > 0) {
            setRawTiers(specific as CommissionTier[]);
            setLoading(false);
            return;
          }
        }

        // Fallback to global tiers (vendedor_id IS NULL)
        // Consolidated + no vendedor selected: pick the first account's global tiers as default.
        const fallbackAccountId = scopedAccountId ?? accountIds[0];
        if (!fallbackAccountId) {
          if (!cancelled) setRawTiers([]);
          return;
        }
        const { data: global } = await supabase
          .from('commission_tiers')
          .select('*')
          .eq('account_id', fallbackAccountId)
          .eq('month', month)
          .is('vendedor_id', null)
          .order('sort_order', { ascending: true });

        if (!cancelled) {
          setRawTiers((global as CommissionTier[]) ?? []);
        }
      } catch {
        if (!cancelled) {
          setRawTiers([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTiers();
    return () => { cancelled = true; };
  }, [vendedorId, month, activeAccountId, isConsolidatedSeller, accountIdsKey]);

  const enriched = useMemo(() => {
    return rawTiers.map((tier) => {
      const vendasNecessarias = Math.ceil((meta * tier.pct_meta) / 100);
      const unlocked = vendas >= vendasNecessarias;
      return { ...tier, unlocked, vendasNecessarias };
    });
  }, [rawTiers, vendas, meta]);

  const currentTier = useMemo(() => {
    const unlocked = enriched.filter((t) => t.unlocked);
    return unlocked.length > 0 ? unlocked[unlocked.length - 1] : null;
  }, [enriched]);

  const totalPremiacao = useMemo(() => {
    return enriched
      .filter((t) => t.unlocked)
      .reduce((sum, t) => sum + t.premiacao, 0);
  }, [enriched]);

  const nextTier = useMemo(() => {
    const locked = enriched.filter((t) => !t.unlocked);
    return locked.length > 0 ? locked[0] : null;
  }, [enriched]);

  const vendasParaProxima = useMemo(() => {
    if (!nextTier) return null;
    return Math.max(0, nextTier.vendasNecessarias - vendas);
  }, [nextTier, vendas]);

  return {
    tiers: enriched,
    currentTier,
    totalPremiacao,
    nextTier,
    vendasParaProxima,
    loading,
  };
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import type { MetaCampaign } from '@/lib/metaAdsApi';
import { matchAllCampaigns, type VendorAlias, type CampaignLink } from '@/lib/campaignMatcher';

interface UseCampaignLinksParams {
  campaigns: MetaCampaign[];
  vendedores: { id: number; nome: string }[];
  month: string;
}

export function useCampaignLinks({ campaigns, vendedores, month }: UseCampaignLinksParams) {
  const { activeAccountId } = useTenant();
  const [aliases, setAliases] = useState<VendorAlias[]>([]);
  const [existingLinks, setExistingLinks] = useState<CampaignLink[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!activeAccountId) return;
    setLoading(true);
    try {
      const [aliasRes, linkRes] = await Promise.all([
        (supabase.from as any)('vendor_aliases').select('*').eq('account_id', activeAccountId),
        (supabase.from as any)('campaign_vendor_links').select('*').eq('account_id', activeAccountId).eq('month', month),
      ]);
      if (aliasRes.data) setAliases(aliasRes.data as VendorAlias[]);
      if (linkRes.data) {
        setExistingLinks(linkRes.data.map((l: any) => ({
          campaign_id: l.campaign_id,
          campaign_name: l.campaign_name,
          vendedor_id: l.vendedor_id,
          vendedor_nome: l.vendedor_nome,
          is_manual_override: l.is_manual_override,
        })));
      }
    } catch (e) {
      console.error('[useCampaignLinks] fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [month, activeAccountId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const links = campaigns.length > 0 && !loading
    ? matchAllCampaigns(campaigns, aliases, vendedores, existingLinks)
    : [];

  const saveLink = useCallback(async (
    campaignId: string, campaignName: string, vendedorId: number | null, vendedorNome: string | null
  ) => {
    if (!activeAccountId) return;
    await (supabase.from as any)('campaign_vendor_links').upsert({
      campaign_id: campaignId,
      campaign_name: campaignName,
      vendedor_id: vendedorId,
      vendedor_nome: vendedorNome,
      is_manual_override: true,
      month,
      account_id: activeAccountId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'account_id,campaign_id,month' });
    await fetchData();
  }, [month, activeAccountId, fetchData]);

  const saveBulkLinks = useCallback(async (linksToSave: CampaignLink[]) => {
    if (!activeAccountId) return;
    const rows = linksToSave.map(l => ({
      campaign_id: l.campaign_id,
      campaign_name: l.campaign_name,
      vendedor_id: l.vendedor_id,
      vendedor_nome: l.vendedor_nome,
      is_manual_override: l.is_manual_override,
      month,
      account_id: activeAccountId,
      updated_at: new Date().toISOString(),
    }));
    await (supabase.from as any)('campaign_vendor_links').upsert(rows, { onConflict: 'account_id,campaign_id,month' });
    await fetchData();
  }, [month, activeAccountId, fetchData]);

  return { links, aliases, loading, saveLink, saveBulkLinks, refreshLinks: fetchData };
}

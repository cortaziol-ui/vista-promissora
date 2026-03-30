import type { MetaCampaign } from './metaAdsApi';

export interface VendorAlias {
  vendedor_id: number;
  alias: string;
  priority: number;
}

export interface CampaignLink {
  campaign_id: string;
  campaign_name: string;
  vendedor_id: number | null;
  vendedor_nome: string | null;
  is_manual_override: boolean;
}

export function matchCampaignToVendor(
  campaignName: string,
  aliases: VendorAlias[],
  vendedores: { id: number; nome: string }[]
): { vendedor_id: number; vendedor_nome: string } | null {
  const upper = campaignName.toUpperCase();
  // Sort by priority DESC so higher-priority aliases match first
  const sorted = [...aliases].sort((a, b) => b.priority - a.priority);
  for (const alias of sorted) {
    if (upper.includes(alias.alias.toUpperCase())) {
      const v = vendedores.find(v => v.id === alias.vendedor_id);
      if (v) return { vendedor_id: v.id, vendedor_nome: v.nome };
    }
  }
  return null;
}

export function matchAllCampaigns(
  campaigns: MetaCampaign[],
  aliases: VendorAlias[],
  vendedores: { id: number; nome: string }[],
  existingLinks: CampaignLink[]
): CampaignLink[] {
  return campaigns.map(c => {
    // Check manual override first
    const manual = existingLinks.find(l => l.campaign_id === c.id && l.is_manual_override);
    if (manual) return manual;

    // Try automatic match
    const match = matchCampaignToVendor(c.name, aliases, vendedores);
    return {
      campaign_id: c.id,
      campaign_name: c.name,
      vendedor_id: match?.vendedor_id ?? null,
      vendedor_nome: match?.vendedor_nome ?? null,
      is_manual_override: false,
    };
  });
}

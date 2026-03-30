import type { MetaCampaign } from './metaAdsApi';
import type { CampaignLink } from './campaignMatcher';

export interface VendorMetrics {
  leads: number;
  spend: number;
  impressions: number;
  clicks: number;
}

export function getLeadsByVendor(
  links: CampaignLink[],
  campaigns: MetaCampaign[]
): Record<number, VendorMetrics> {
  const result: Record<number, VendorMetrics> = {};

  for (const link of links) {
    if (!link.vendedor_id) continue;
    const campaign = campaigns.find(c => c.id === link.campaign_id);
    if (!campaign?.insights) continue;

    if (!result[link.vendedor_id]) {
      result[link.vendedor_id] = { leads: 0, spend: 0, impressions: 0, clicks: 0 };
    }

    result[link.vendedor_id].leads += campaign.insights.leads;
    result[link.vendedor_id].spend += campaign.insights.spend;
    result[link.vendedor_id].impressions += campaign.insights.impressions;
    result[link.vendedor_id].clicks += campaign.insights.clicks;
  }

  return result;
}

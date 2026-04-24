import { describe, it, expect } from 'vitest';
import { getLeadsByVendor } from '../vendorLeads';
import type { CampaignLink } from '../campaignMatcher';
import type { MetaCampaign } from '../metaAdsApi';

describe('getLeadsByVendor', () => {
  const campaigns: MetaCampaign[] = [
    { id: 'c1', name: 'Camp João', status: 'ACTIVE', insights: { spend: 100, impressions: 1000, clicks: 50, leads: 10 } },
    { id: 'c2', name: 'Camp João 2', status: 'ACTIVE', insights: { spend: 200, impressions: 2000, clicks: 80, leads: 15 } },
    { id: 'c3', name: 'Camp Maria', status: 'ACTIVE', insights: { spend: 150, impressions: 1500, clicks: 60, leads: 12 } },
  ];

  const links: CampaignLink[] = [
    { campaign_id: 'c1', campaign_name: 'Camp João', vendedor_id: 1, vendedor_nome: 'João', is_manual_override: false },
    { campaign_id: 'c2', campaign_name: 'Camp João 2', vendedor_id: 1, vendedor_nome: 'João', is_manual_override: false },
    { campaign_id: 'c3', campaign_name: 'Camp Maria', vendedor_id: 2, vendedor_nome: 'Maria', is_manual_override: false },
  ];

  it('aggregates metrics per vendor', () => {
    const result = getLeadsByVendor(links, campaigns);

    expect(result[1]).toEqual({
      leads: 25,       // 10 + 15
      spend: 300,      // 100 + 200
      impressions: 3000, // 1000 + 2000
      clicks: 130,     // 50 + 80
    });

    expect(result[2]).toEqual({
      leads: 12,
      spend: 150,
      impressions: 1500,
      clicks: 60,
    });
  });

  it('ignores links without vendedor_id', () => {
    const linksWithNull: CampaignLink[] = [
      { campaign_id: 'c1', campaign_name: 'Camp', vendedor_id: null, vendedor_nome: null, is_manual_override: false },
    ];
    const result = getLeadsByVendor(linksWithNull, campaigns);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('ignores campaigns without insights', () => {
    const noInsightsCampaigns: MetaCampaign[] = [
      { id: 'c1', name: 'Camp', status: 'PAUSED' } as MetaCampaign,
    ];
    const result = getLeadsByVendor(links, noInsightsCampaigns);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('returns empty object for empty input', () => {
    expect(getLeadsByVendor([], [])).toEqual({});
  });
});

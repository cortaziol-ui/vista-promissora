import { describe, it, expect } from 'vitest';
import { matchCampaignToVendor, matchAllCampaigns } from '../campaignMatcher';
import type { VendorAlias, CampaignLink } from '../campaignMatcher';

const vendedores = [
  { id: 1, nome: 'João' },
  { id: 2, nome: 'Maria' },
  { id: 3, nome: 'Pedro' },
];

const aliases: VendorAlias[] = [
  { vendedor_id: 1, alias: 'JOAO', priority: 1 },
  { vendedor_id: 2, alias: 'MARIA', priority: 1 },
  { vendedor_id: 3, alias: 'PEDRO', priority: 1 },
  { vendedor_id: 1, alias: 'JP', priority: 2 },
];

describe('matchCampaignToVendor', () => {
  it('matches campaign name to vendor by alias (case insensitive)', () => {
    const result = matchCampaignToVendor('Campanha Joao - Vendas', aliases, vendedores);
    expect(result).toEqual({ vendedor_id: 1, vendedor_nome: 'João' });
  });

  it('returns null when no alias matches', () => {
    const result = matchCampaignToVendor('Campanha Genérica', aliases, vendedores);
    expect(result).toBeNull();
  });

  it('prefers higher priority alias', () => {
    // 'JP' has priority 2 (higher), should match João even if other aliases exist
    const result = matchCampaignToVendor('Campanha JP - Leads', aliases, vendedores);
    expect(result).toEqual({ vendedor_id: 1, vendedor_nome: 'João' });
  });

  it('handles case insensitive matching', () => {
    const result = matchCampaignToVendor('campanha maria leads', aliases, vendedores);
    expect(result).toEqual({ vendedor_id: 2, vendedor_nome: 'Maria' });
  });

  it('returns null if vendor not found in vendedores list', () => {
    const orphanAliases: VendorAlias[] = [
      { vendedor_id: 999, alias: 'FANTASMA', priority: 1 },
    ];
    const result = matchCampaignToVendor('Campanha FANTASMA', orphanAliases, vendedores);
    expect(result).toBeNull();
  });
});

describe('matchAllCampaigns', () => {
  const campaigns = [
    { id: 'c1', name: 'Campanha JOAO - Conversão', status: 'ACTIVE', insights: { spend: 100, impressions: 1000, clicks: 50, leads: 10 } },
    { id: 'c2', name: 'Campanha MARIA - Tráfego', status: 'ACTIVE', insights: { spend: 200, impressions: 2000, clicks: 100, leads: 20 } },
    { id: 'c3', name: 'Campanha Genérica', status: 'ACTIVE', insights: { spend: 50, impressions: 500, clicks: 25, leads: 5 } },
  ];

  it('matches all campaigns and returns CampaignLink array', () => {
    const result = matchAllCampaigns(campaigns, aliases, vendedores, []);
    expect(result).toHaveLength(3);
    expect(result[0].vendedor_id).toBe(1);
    expect(result[1].vendedor_id).toBe(2);
    expect(result[2].vendedor_id).toBeNull();
  });

  it('preserves manual overrides', () => {
    const manualLinks: CampaignLink[] = [{
      campaign_id: 'c3',
      campaign_name: 'Campanha Genérica',
      vendedor_id: 3,
      vendedor_nome: 'Pedro',
      is_manual_override: true,
    }];

    const result = matchAllCampaigns(campaigns, aliases, vendedores, manualLinks);
    const c3 = result.find(r => r.campaign_id === 'c3');
    expect(c3?.vendedor_id).toBe(3);
    expect(c3?.is_manual_override).toBe(true);
  });

  it('automatic match has is_manual_override false', () => {
    const result = matchAllCampaigns(campaigns, aliases, vendedores, []);
    expect(result[0].is_manual_override).toBe(false);
  });
});

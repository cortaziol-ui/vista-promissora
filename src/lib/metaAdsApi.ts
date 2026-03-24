const BASE_URL = 'https://graph.facebook.com/v21.0';

export interface MetaAdsConfig {
  accessToken: string;
  adAccountId: string;
  currency: string;
  timezone: string;
  lastSync?: string;
  connected?: boolean;
}

export interface MetaInsights {
  impressions: number;
  clicks: number;
  spend: number;
  cpc: number;
  ctr: number;
  leads: number;
  conversions: number;
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  insights?: MetaInsights;
}

export function getMetaConfig(): MetaAdsConfig | null {
  try {
    const raw = localStorage.getItem('meta_ads_config');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveMetaConfig(config: MetaAdsConfig) {
  localStorage.setItem('meta_ads_config', JSON.stringify(config));
}

export function getCachedInsights(): { data: MetaInsights; campaigns: MetaCampaign[]; timestamp: string } | null {
  try {
    const raw = localStorage.getItem('meta_ads_insights_cache');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCachedInsights(data: MetaInsights, campaigns: MetaCampaign[]) {
  const timestamp = new Date().toISOString();
  localStorage.setItem('meta_ads_insights_cache', JSON.stringify({ data, campaigns, timestamp }));
  // Update lastSync on config
  const config = getMetaConfig();
  if (config) {
    config.lastSync = timestamp;
    config.connected = true;
    saveMetaConfig(config);
  }
}

export async function testConnection(token: string): Promise<{ success: boolean; name?: string; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/me?fields=id,name&access_token=${token}`);
    const data = await res.json();
    if (data.error) return { success: false, error: data.error.message };
    return { success: true, name: data.name };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro de conexão' };
  }
}

export async function fetchCampaignInsights(
  token: string,
  adAccountId: string,
  dateRange: { since: string; until: string }
): Promise<{ insights: MetaInsights; campaigns: MetaCampaign[]; error?: string }> {
  const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

  try {
    // Fetch account-level insights
    const insightsRes = await fetch(
      `${BASE_URL}/${accountId}/insights?fields=impressions,clicks,spend,cpc,ctr,actions&time_range=${JSON.stringify(dateRange)}&access_token=${token}`
    );
    const insightsData = await insightsRes.json();

    if (insightsData.error) {
      return { insights: emptyInsights(), campaigns: [], error: insightsData.error.message };
    }

    const row = insightsData.data?.[0] || {};
    const actions = row.actions || [];
    const leadAction = actions.find((a: any) => a.action_type === 'lead') || { value: '0' };
    const convAction = actions.find((a: any) => a.action_type === 'offsite_conversion.fb_pixel_purchase' || a.action_type === 'purchase') || { value: '0' };

    const insights: MetaInsights = {
      impressions: Number(row.impressions || 0),
      clicks: Number(row.clicks || 0),
      spend: Number(row.spend || 0),
      cpc: Number(row.cpc || 0),
      ctr: Number(row.ctr || 0),
      leads: Number(leadAction.value),
      conversions: Number(convAction.value),
    };

    // Fetch campaigns
    const campRes = await fetch(
      `${BASE_URL}/${accountId}/campaigns?fields=id,name,status,insights.time_range(${JSON.stringify(dateRange)}){impressions,clicks,spend,cpc,ctr,actions}&limit=50&access_token=${token}`
    );
    const campData = await campRes.json();
    const campaigns: MetaCampaign[] = (campData.data || []).map((c: any) => {
      const ci = c.insights?.data?.[0] || {};
      const cActions = ci.actions || [];
      const cLead = cActions.find((a: any) => a.action_type === 'lead') || { value: '0' };
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        insights: {
          impressions: Number(ci.impressions || 0),
          clicks: Number(ci.clicks || 0),
          spend: Number(ci.spend || 0),
          cpc: Number(ci.cpc || 0),
          ctr: Number(ci.ctr || 0),
          leads: Number(cLead.value),
          conversions: 0,
        },
      };
    });

    saveCachedInsights(insights, campaigns);
    return { insights, campaigns };
  } catch (e: any) {
    return { insights: emptyInsights(), campaigns: [], error: e.message || 'Erro ao buscar dados' };
  }
}

function emptyInsights(): MetaInsights {
  return { impressions: 0, clicks: 0, spend: 0, cpc: 0, ctr: 0, leads: 0, conversions: 0 };
}

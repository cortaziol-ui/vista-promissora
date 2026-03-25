import { supabase } from '@/integrations/supabase/client';

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
  const config = getMetaConfig();
  if (config) {
    config.lastSync = timestamp;
    config.connected = true;
    saveMetaConfig(config);
  }
}

export async function testConnection(token: string): Promise<{ success: boolean; name?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('meta-ads-proxy', {
      body: { action: 'test', accessToken: token },
    });
    if (error) return { success: false, error: error.message };
    return data;
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro de conexão' };
  }
}

export async function fetchCampaignInsights(
  token: string,
  adAccountId: string,
  dateRange: { since: string; until: string }
): Promise<{ insights: MetaInsights; campaigns: MetaCampaign[]; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('meta-ads-proxy', {
      body: { action: 'sync', accessToken: token, adAccountId, dateRange },
    });
    if (error) return { insights: emptyInsights(), campaigns: [], error: error.message };
    if (data.error) return { insights: emptyInsights(), campaigns: [], error: data.error };
    
    saveCachedInsights(data.insights, data.campaigns);
    return { insights: data.insights, campaigns: data.campaigns };
  } catch (e: any) {
    return { insights: emptyInsights(), campaigns: [], error: e.message || 'Erro ao buscar dados' };
  }
}

function emptyInsights(): MetaInsights {
  return { impressions: 0, clicks: 0, spend: 0, cpc: 0, ctr: 0, leads: 0, conversions: 0 };
}

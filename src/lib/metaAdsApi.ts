const META_API = 'https://graph.facebook.com/v21.0';

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

function emptyInsights(): MetaInsights {
  return { impressions: 0, clicks: 0, spend: 0, cpc: 0, ctr: 0, leads: 0, conversions: 0 };
}

/** Test connection by fetching the user's name from the Graph API */
export async function testConnection(token: string): Promise<{ success: boolean; name?: string; error?: string }> {
  try {
    const res = await fetch(`${META_API}/me?fields=name&access_token=${token}`, { signal: AbortSignal.timeout(15000) });
    const data = await res.json();
    if (data.error) return { success: false, error: data.error.message };
    return { success: true, name: data.name };
  } catch (e: any) {
    return { success: false, error: e.name === 'TimeoutError' ? 'Tempo limite excedido.' : (e.message || 'Erro de conexão') };
  }
}

/** Test an ad account by fetching its name */
export async function testAdAccount(token: string, adAccountId: string): Promise<{ success: boolean; name?: string; error?: string }> {
  try {
    const actId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    const res = await fetch(`${META_API}/${actId}?fields=name,account_status&access_token=${token}`, { signal: AbortSignal.timeout(15000) });
    const data = await res.json();
    if (data.error) return { success: false, error: data.error.message };
    return { success: true, name: data.name };
  } catch (e: any) {
    return { success: false, error: e.name === 'TimeoutError' ? 'Tempo limite excedido.' : (e.message || 'Erro de conexão') };
  }
}

/** Fetch campaign insights from the Meta Graph API */
export async function fetchCampaignInsights(
  token: string,
  adAccountId: string,
  dateRange: { since: string; until: string }
): Promise<{ insights: MetaInsights; campaigns: MetaCampaign[]; error?: string }> {
  try {
    const actId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

    // Fetch campaigns with insights
    const fields = 'name,status,insights.time_range({"since":"' + dateRange.since + '","until":"' + dateRange.until + '"}){impressions,clicks,spend,cpc,ctr,actions}';
    // Fetch ALL campaigns (active + paused + archived) that may have data in the period
    const url = `${META_API}/${actId}/campaigns?fields=${encodeURIComponent(fields)}&limit=500&access_token=${token}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    const data = await res.json();

    if (data.error) return { insights: emptyInsights(), campaigns: [], error: data.error.message };

    const campaigns: MetaCampaign[] = [];
    let totalImpressions = 0, totalClicks = 0, totalSpend = 0, totalLeads = 0, totalConversions = 0;

    for (const c of (data.data || [])) {
      const ins = c.insights?.data?.[0];
      let campInsights: MetaInsights | undefined;

      if (ins) {
        const impressions = Number(ins.impressions || 0);
        const clicks = Number(ins.clicks || 0);
        const spend = Number(ins.spend || 0);
        const cpc = Number(ins.cpc || 0);
        const ctr = Number(ins.ctr || 0);

        // Extract leads and conversions from actions
        // Leads = ONLY messaging conversations (WhatsApp/Messenger) — matches Meta Ads Manager "Results"
        let leads = 0, conversions = 0;
        for (const action of (ins.actions || [])) {
          const t = action.action_type;
          const v = Number(action.value || 0);
          if (t === 'onsite_conversion.messaging_conversation_started_7d') leads += v;
          if (t === 'purchase' || t === 'complete_registration') conversions += v;
        }

        campInsights = { impressions, clicks, spend, cpc, ctr, leads, conversions };
        totalImpressions += impressions;
        totalClicks += clicks;
        totalSpend += spend;
        totalLeads += leads;
        totalConversions += conversions;
      }

      campaigns.push({ id: c.id, name: c.name, status: c.status, insights: campInsights });
    }

    const totalCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const totalCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    return {
      insights: {
        impressions: totalImpressions,
        clicks: totalClicks,
        spend: totalSpend,
        cpc: totalCpc,
        ctr: totalCtr,
        leads: totalLeads,
        conversions: totalConversions,
      },
      campaigns,
    };
  } catch (e: any) {
    if (e.name === 'TimeoutError') return { insights: emptyInsights(), campaigns: [], error: 'Tempo limite excedido (30s).' };
    return { insights: emptyInsights(), campaigns: [], error: e.message || 'Erro ao buscar dados' };
  }
}

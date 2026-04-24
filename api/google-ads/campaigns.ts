import type { VercelRequest, VercelResponse } from "@vercel/node";
import { queryGoogleAds, microsToBrl } from "../_lib/google-ads-client";

export interface GoogleAdsInsightsResponse {
  impressions: number;
  clicks: number;
  spend: number;
  cpc: number;
  ctr: number;
  conversions: number;
}

export interface GoogleAdsCampaignResponse {
  id: string;
  name: string;
  status: string;
  insights: GoogleAdsInsightsResponse;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const since = req.query.since as string;
  const until = req.query.until as string;

  if (!since || !until) {
    return res.status(400).json({ error: "Parametros since e until sao obrigatorios." });
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(since) || !dateRegex.test(until)) {
    return res.status(400).json({ error: "Formato de data invalido. Use YYYY-MM-DD." });
  }

  const gaql = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc
    FROM campaign
    WHERE segments.date BETWEEN '${since}' AND '${until}'
    ORDER BY metrics.cost_micros DESC
  `;

  const result = await queryGoogleAds(gaql);

  if (result.error) {
    return res.status(200).json({
      insights: emptyInsights(),
      campaigns: [],
      error: result.error,
    });
  }

  // Aggregate totals
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalCostMicros = 0;
  let totalConversions = 0;

  const campaigns: GoogleAdsCampaignResponse[] = [];

  for (const row of result.rows) {
    const m = row.metrics;
    const c = row.campaign;
    if (!m || !c) continue;

    const impressions = Number(m.impressions || 0);
    const clicks = Number(m.clicks || 0);
    const costMicros = Number(m.costMicros || 0);
    const conversions = Number(m.conversions || 0);
    const ctr = Number(m.ctr || 0) * 100; // API returns as fraction
    const cpc = microsToBrl(m.averageCpc || 0);
    const spend = microsToBrl(costMicros);

    totalImpressions += impressions;
    totalClicks += clicks;
    totalCostMicros += costMicros;
    totalConversions += conversions;

    // Normalize campaign status
    const statusMap: Record<string, string> = {
      ENABLED: "ACTIVE",
      PAUSED: "PAUSED",
      REMOVED: "REMOVED",
    };

    campaigns.push({
      id: c.id,
      name: c.name,
      status: statusMap[c.status] || c.status,
      insights: { impressions, clicks, spend, cpc, ctr, conversions },
    });
  }

  const totalSpend = microsToBrl(totalCostMicros);
  const totalCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const totalCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  res.status(200).json({
    insights: {
      impressions: totalImpressions,
      clicks: totalClicks,
      spend: totalSpend,
      cpc: totalCpc,
      ctr: totalCtr,
      conversions: totalConversions,
    },
    campaigns,
  });
}

function emptyInsights(): GoogleAdsInsightsResponse {
  return { impressions: 0, clicks: 0, spend: 0, cpc: 0, ctr: 0, conversions: 0 };
}

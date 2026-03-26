const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://graph.facebook.com/v21.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, adAccountId, dateRange, accessToken: clientToken } = await req.json();

    // Use token from request (stored client-side for now, can be moved to secrets later)
    const token = clientToken;
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Access token não fornecido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "test") {
      const res = await fetch(`${BASE_URL}/me?fields=id,name&access_token=${token}`);
      const data = await res.json();
      if (data.error) {
        return new Response(
          JSON.stringify({ success: false, error: data.error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ success: true, name: data.name }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "sync") {
      const accountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
      const timeRange = encodeURIComponent(JSON.stringify(dateRange));

      // Fetch account-level insights
      const insightsUrl = `${BASE_URL}/${accountId}/insights?fields=impressions,clicks,spend,cpc,ctr,actions&time_range=${timeRange}&access_token=${token}`;
      console.log("[MetaAdsProxy] Fetching insights for", accountId);
      const insightsRes = await fetch(insightsUrl);
      const insightsData = await insightsRes.json();

      if (insightsData.error) {
        const errMsg = insightsData.error.message || "Erro desconhecido";
        const code = insightsData.error.code;
        const hint =
          code === 190
            ? " — Token expirado ou inválido."
            : code === 10 || code === 200
            ? " — Permissão negada. No Graph API Explorer, selecione o Ad Account no dropdown e marque ads_read."
            : "";
        return new Response(
          JSON.stringify({ error: errMsg + hint }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const row = insightsData.data?.[0] || {};
      const actions = row.actions || [];
      const leadAction = actions.find((a: any) => a.action_type === "lead") || { value: "0" };
      const convAction =
        actions.find(
          (a: any) =>
            a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase"
        ) || { value: "0" };

      const insights = {
        impressions: Number(row.impressions || 0),
        clicks: Number(row.clicks || 0),
        spend: Number(row.spend || 0),
        cpc: Number(row.cpc || 0),
        ctr: Number(row.ctr || 0),
        leads: Number(leadAction.value),
        conversions: Number(convAction.value),
      };

      // Fetch campaigns
      const campUrl = `${BASE_URL}/${accountId}/campaigns?fields=id,name,status&limit=50&access_token=${token}`;
      const campRes = await fetch(campUrl);
      const campData = await campRes.json();

      const campaigns = await Promise.all(
        (campData.data || []).map(async (c: any) => {
          try {
            const ciUrl = `${BASE_URL}/${c.id}/insights?fields=impressions,clicks,spend,cpc,ctr,actions&time_range=${timeRange}&access_token=${token}`;
            const ciRes = await fetch(ciUrl);
            const ciData = await ciRes.json();
            const ci = ciData.data?.[0] || {};
            const cActions = ci.actions || [];
            const cLead = cActions.find((a: any) => a.action_type === "lead") || { value: "0" };
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
          } catch {
            return { id: c.id, name: c.name, status: c.status };
          }
        })
      );

      return new Response(
        JSON.stringify({ insights, campaigns }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação inválida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[MetaAdsProxy] Error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

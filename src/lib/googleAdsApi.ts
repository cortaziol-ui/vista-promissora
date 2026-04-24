export interface GoogleAdsInsights {
  impressions: number;
  clicks: number;
  spend: number;
  cpc: number;
  ctr: number;
  conversions: number;
}

export interface GoogleAdsCampaign {
  id: string;
  name: string;
  status: string;
  insights: GoogleAdsInsights;
}

export async function checkGoogleAdsConnection(): Promise<{
  connected: boolean;
  customerId?: string | null;
  error?: string;
}> {
  try {
    const res = await fetch("/api/google-ads/token-status", {
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    return data;
  } catch (e: any) {
    return {
      connected: false,
      error:
        e.name === "TimeoutError"
          ? "Tempo limite excedido."
          : e.message || "Erro ao verificar conexao.",
    };
  }
}

export interface GoogleAdsHealthCheck {
  ok: boolean;
  label: string;
  detail?: string;
  hint?: string;
}

export interface GoogleAdsHealthResponse {
  status: "ready" | "missing_config" | "error";
  checks: GoogleAdsHealthCheck[];
  missing: string[];
  nextStep: string;
}

/**
 * Endpoint de diagnóstico — retorna status detalhado de cada pré-requisito
 * (env vars, Supabase, tabela, refresh_token). Útil pra SettingsPage mostrar
 * exatamente qual credencial falta.
 */
export async function checkGoogleAdsHealth(): Promise<GoogleAdsHealthResponse> {
  try {
    const res = await fetch("/api/google-ads/health", {
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    return data;
  } catch (e: any) {
    return {
      status: "error",
      checks: [],
      missing: [],
      nextStep:
        e.name === "TimeoutError"
          ? "Tempo limite excedido ao chamar /api/google-ads/health."
          : e.message || "Erro ao verificar health.",
    };
  }
}

export async function fetchGoogleAdsCampaigns(dateRange: {
  since: string;
  until: string;
}): Promise<{
  insights: GoogleAdsInsights;
  campaigns: GoogleAdsCampaign[];
  error?: string;
}> {
  const empty: GoogleAdsInsights = {
    impressions: 0,
    clicks: 0,
    spend: 0,
    cpc: 0,
    ctr: 0,
    conversions: 0,
  };

  try {
    const params = new URLSearchParams({
      since: dateRange.since,
      until: dateRange.until,
    });

    const res = await fetch(`/api/google-ads/campaigns?${params}`, {
      signal: AbortSignal.timeout(30000),
    });

    const data = await res.json();

    if (data.error) {
      return { insights: empty, campaigns: [], error: data.error };
    }

    return {
      insights: data.insights || empty,
      campaigns: data.campaigns || [],
    };
  } catch (e: any) {
    if (e.name === "TimeoutError") {
      return { insights: empty, campaigns: [], error: "Tempo limite excedido (30s)." };
    }
    return { insights: empty, campaigns: [], error: e.message || "Erro ao buscar dados." };
  }
}

export async function disconnectGoogleAds(): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/google-ads/disconnect", { method: "POST" });
    const data = await res.json();
    return data;
  } catch {
    return { success: false, error: "Erro ao desconectar." };
  }
}

import { getValidAccessToken } from "./google-auth";

const GOOGLE_ADS_API = "https://googleads.googleapis.com/v18";

export interface GoogleAdsRow {
  campaign?: {
    id: string;
    name: string;
    status: string;
    resourceName: string;
  };
  metrics?: {
    impressions: string;
    clicks: string;
    costMicros: string;
    conversions: string;
    ctr: string;
    averageCpc: string;
  };
  customer?: {
    id: string;
    descriptiveName: string;
  };
}

export interface QueryResult {
  rows: GoogleAdsRow[];
  error?: string;
}

export async function queryGoogleAds(gaqlQuery: string): Promise<QueryResult> {
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
  const developerToken = process.env.GOOGLE_DEVELOPER_TOKEN;
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;

  if (!customerId || !developerToken) {
    return {
      rows: [],
      error: "GOOGLE_ADS_CUSTOMER_ID ou GOOGLE_DEVELOPER_TOKEN nao configurados.",
    };
  }

  const tokenResult = await getValidAccessToken();
  if ("error" in tokenResult) {
    return { rows: [], error: tokenResult.error };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${tokenResult.accessToken}`,
    "developer-token": developerToken,
    "Content-Type": "application/json",
  };

  if (loginCustomerId) {
    headers["login-customer-id"] = loginCustomerId;
  }

  const cleanCustomerId = customerId.replace(/-/g, "");

  const res = await fetch(
    `${GOOGLE_ADS_API}/customers/${cleanCustomerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ query: gaqlQuery }),
    }
  );

  if (!res.ok) {
    const errorBody = await res.text();
    let errorMsg = `Google Ads API erro ${res.status}`;
    try {
      const parsed = JSON.parse(errorBody);
      const details = parsed?.[0]?.error?.message || parsed?.error?.message;
      if (details) errorMsg = details;
    } catch {
      // use default error
    }
    return { rows: [], error: errorMsg };
  }

  const body = await res.json();

  // searchStream returns an array of result batches
  const allRows: GoogleAdsRow[] = [];
  for (const batch of body) {
    if (batch.results) {
      allRows.push(...batch.results);
    }
  }

  return { rows: allRows };
}

/** Convert cost_micros (int64 string) to BRL number */
export function microsToBrl(micros: string | number): number {
  return Number(micros) / 1_000_000;
}

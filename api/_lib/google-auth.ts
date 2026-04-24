import { supabase } from "./supabase";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const TABLE = "google_oauth_tokens";
const ROW_ID = "default";

interface TokenRow {
  id: string;
  refresh_token: string;
  access_token: string | null;
  expires_at: string | null;
  updated_at: string;
}

interface TokenResult {
  accessToken: string;
}

interface TokenError {
  error: string;
}

export async function getValidAccessToken(): Promise<TokenResult | TokenError> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", ROW_ID)
    .single();

  if (error || !data) {
    return { error: "Nenhum token encontrado. Conecte sua conta Google Ads." };
  }

  const row = data as TokenRow;

  // Check if access token is still valid (with 5 min buffer)
  if (row.access_token && row.expires_at) {
    const expiresAt = new Date(row.expires_at);
    const now = new Date();
    const bufferMs = 5 * 60 * 1000;

    if (expiresAt.getTime() - bufferMs > now.getTime()) {
      return { accessToken: row.access_token };
    }
  }

  // Refresh the token
  return refreshAccessToken(row.refresh_token);
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenResult | TokenError> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return { error: "GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET nao configurados." };
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const body = await res.json();

  if (!res.ok || body.error) {
    return { error: body.error_description || body.error || "Erro ao renovar token." };
  }

  const accessToken: string = body.access_token;
  const expiresIn: number = body.expires_in || 3600;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // Save refreshed token
  await supabase.from(TABLE).upsert({
    id: ROW_ID,
    refresh_token: refreshToken,
    access_token: accessToken,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });

  return { accessToken };
}

export async function saveTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): Promise<void> {
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  await supabase.from(TABLE).upsert({
    id: ROW_ID,
    refresh_token: refreshToken,
    access_token: accessToken,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });
}

export async function hasValidRefreshToken(): Promise<boolean> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("refresh_token")
    .eq("id", ROW_ID)
    .single();

  return !error && !!data?.refresh_token;
}

export async function deleteTokens(): Promise<void> {
  await supabase.from(TABLE).delete().eq("id", ROW_ID);
}

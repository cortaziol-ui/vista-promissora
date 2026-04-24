import type { VercelRequest, VercelResponse } from "@vercel/node";
import { saveTokens } from "../_lib/google-auth";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = req.query.code as string | undefined;
  const error = req.query.error as string | undefined;

  if (error) {
    return res.status(400).send(errorPage(`Autorizacao negada: ${error}`));
  }

  if (!code) {
    return res.status(400).send(errorPage("Codigo de autorizacao ausente."));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).send(errorPage("Credenciais do servidor nao configuradas."));
  }

  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const redirectUri = `${protocol}://${host}/api/google-ads/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenBody = await tokenRes.json();

  if (!tokenRes.ok || tokenBody.error) {
    const msg = tokenBody.error_description || tokenBody.error || "Erro ao trocar codigo por token.";
    return res.status(400).send(errorPage(msg));
  }

  const { access_token, refresh_token, expires_in } = tokenBody;

  if (!refresh_token) {
    return res
      .status(400)
      .send(errorPage("Refresh token nao recebido. Tente novamente com prompt=consent."));
  }

  // Save tokens to Supabase
  await saveTokens(access_token, refresh_token, expires_in || 3600);

  // Return success page that closes the popup and notifies the opener
  res.status(200).send(successPage());
}

function successPage(): string {
  return `<!DOCTYPE html>
<html>
<head><title>Google Ads Conectado</title>
<style>
  body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
  .card { text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 400px; }
  .icon { font-size: 3rem; margin-bottom: 1rem; }
  h2 { margin: 0 0 0.5rem; color: #1a1a2e; }
  p { color: #64748b; margin: 0; }
</style>
</head>
<body>
<div class="card">
  <div class="icon">✅</div>
  <h2>Google Ads Conectado</h2>
  <p>Conta vinculada com sucesso. Esta janela sera fechada automaticamente.</p>
</div>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: 'google-ads-connected' }, '*');
  }
  setTimeout(() => window.close(), 2000);
</script>
</body>
</html>`;
}

function errorPage(message: string): string {
  return `<!DOCTYPE html>
<html>
<head><title>Erro — Google Ads</title>
<style>
  body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
  .card { text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 400px; }
  .icon { font-size: 3rem; margin-bottom: 1rem; }
  h2 { margin: 0 0 0.5rem; color: #1a1a2e; }
  p { color: #ef4444; margin: 0; font-size: 0.875rem; }
</style>
</head>
<body>
<div class="card">
  <div class="icon">❌</div>
  <h2>Erro na Conexao</h2>
  <p>${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
</div>
</body>
</html>`;
}

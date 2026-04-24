import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

/**
 * Endpoint de diagnóstico — checa TUDO que precisa estar configurado pra Google Ads API funcionar.
 *
 * Uso: GET /api/google-ads/health
 * Retorna um JSON com status de cada peça (env vars, Supabase, tabela, token salvo).
 *
 * Útil pra SettingsPage mostrar ao Leandro exatamente qual credencial falta.
 */

type CheckResult = {
  ok: boolean;
  label: string;
  detail?: string;
  hint?: string;
};

type HealthResponse = {
  status: "ready" | "missing_config" | "error";
  checks: CheckResult[];
  missing: string[];
  nextStep: string;
};

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const checks: CheckResult[] = [];
  const missing: string[] = [];

  // 1. Env vars Google OAuth
  const envVars = [
    {
      key: "GOOGLE_CLIENT_ID",
      hint: "Google Cloud Console → APIs & Services → Credentials → OAuth Client ID (Web application)",
    },
    {
      key: "GOOGLE_CLIENT_SECRET",
      hint: "Mesmo lugar do GOOGLE_CLIENT_ID",
    },
    {
      key: "GOOGLE_REDIRECT_URI",
      hint: "Deve ser exatamente: https://outcom-dashboard.vercel.app/api/google-ads/callback",
    },
    {
      key: "GOOGLE_ADS_DEVELOPER_TOKEN",
      hint: "Google Ads → Tools → API Center (solicitar nível Basic, aprovação 5-14 dias úteis)",
    },
    {
      key: "GOOGLE_ADS_LOGIN_CUSTOMER_ID",
      hint: "Customer ID da conta MCC Google Ads (canto superior direito, sem hífens)",
    },
    {
      key: "SUPABASE_URL",
      hint: "Supabase Project Settings → API → Project URL",
    },
    {
      key: "SUPABASE_SERVICE_ROLE_KEY",
      hint: "Supabase Project Settings → API → service_role key (NÃO a anon)",
    },
  ];

  for (const { key, hint } of envVars) {
    const value = process.env[key];
    const ok = !!value && value.length > 10;
    checks.push({
      ok,
      label: `Env var ${key}`,
      detail: ok ? "configurada" : "ausente ou inválida",
      hint: ok ? undefined : hint,
    });
    if (!ok) missing.push(key);
  }

  // 2. Se Supabase está configurado, testar conexão + tabela
  const supabaseConfigured =
    !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseConfigured) {
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
      );

      // Tenta fazer um select simples na tabela esperada
      const { data, error } = await supabase
        .from("google_oauth_tokens")
        .select("id, updated_at")
        .limit(1);

      if (error) {
        // Tabela não existe ou RLS bloqueou
        const isMissingTable = error.message?.includes("does not exist");
        checks.push({
          ok: false,
          label: "Tabela google_oauth_tokens",
          detail: isMissingTable ? "tabela não existe" : error.message,
          hint: isMissingTable
            ? "Rodar migração em supabase/migrations/001_google_oauth_tokens.sql"
            : "Verificar policies RLS ou credencial service_role",
        });
        missing.push("supabase_table");
      } else {
        checks.push({
          ok: true,
          label: "Tabela google_oauth_tokens",
          detail: "acessível",
        });

        // Se tabela existe, verificar se refresh_token está salvo
        const hasToken = data && data.length > 0;
        checks.push({
          ok: hasToken,
          label: "Refresh token OAuth",
          detail: hasToken ? "salvo" : "não conectado ainda",
          hint: hasToken
            ? undefined
            : "Acessar SettingsPage → clicar 'Conectar Google Ads' pra gerar refresh_token",
        });
        if (!hasToken) missing.push("oauth_refresh_token");
      }
    } catch (e: any) {
      checks.push({
        ok: false,
        label: "Conexão Supabase",
        detail: e.message || "falha",
        hint: "Verificar SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY",
      });
      missing.push("supabase_connection");
    }
  }

  // 3. Veredicto final
  const allEnvsOk = envVars.every(({ key }) => !!process.env[key]);
  const hasRefreshToken = !missing.includes("oauth_refresh_token");

  let status: HealthResponse["status"];
  let nextStep: string;

  if (missing.length === 0 && allEnvsOk && hasRefreshToken) {
    status = "ready";
    nextStep = "Tudo ok. Dashboard conectado ao Google Ads.";
  } else if (!allEnvsOk) {
    status = "missing_config";
    nextStep = `Configurar no Vercel: ${missing.filter((m) => m.startsWith("GOOGLE") || m.startsWith("SUPABASE")).join(", ")}`;
  } else if (missing.includes("supabase_table")) {
    status = "missing_config";
    nextStep = "Rodar migração SQL em supabase/migrations/ pra criar tabela google_oauth_tokens";
  } else if (!hasRefreshToken) {
    status = "missing_config";
    nextStep = "Clicar em 'Conectar Google Ads' na SettingsPage (fluxo OAuth)";
  } else {
    status = "error";
    nextStep = "Verificar detalhes nos checks abaixo";
  }

  const response: HealthResponse = {
    status,
    checks,
    missing,
    nextStep,
  };

  res.status(200).json(response);
}

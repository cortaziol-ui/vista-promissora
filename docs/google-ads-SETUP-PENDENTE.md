# ⚠️ Setup Pendente — Google Ads API no outcom-dashboard

Estrutura copiada do `plug-dashboard` em 2026-04-22 via Trilha Paralela da viabilidade.

## O que foi copiado

```
outcom-dashboard/
├── .env.example                              ← template das 7 env vars
├── api/
│   ├── _lib/
│   │   ├── google-ads-client.ts              ← GAQL query builder
│   │   ├── google-auth.ts                    ← refresh flow OAuth
│   │   └── supabase.ts                       ← client service_role
│   └── google-ads/
│       ├── auth.ts                           ← inicia OAuth
│       ├── callback.ts                       ← salva refresh_token
│       ├── campaigns.ts                      ← GAQL + insights
│       ├── disconnect.ts                     ← apaga refresh_token
│       ├── health.ts                         ← diagnóstico detalhado
│       └── token-status.ts                   ← quick check
├── docs/
│   └── google-ads-setup.md                   ← guia passo a passo
├── src/lib/
│   └── googleAdsApi.ts                       ← client frontend
└── supabase/migrations/
    └── 001_google_oauth_tokens.sql           ← tabela 1-row com RLS
```

## 🛠️ Antes de usar — 3 ajustes pendentes

### 1. Instalar dependência faltante

```bash
cd ~/Developer/outcom-dashboard
bun add -D @vercel/node
# ou
npm i -D @vercel/node
```

### 2. Configurar Vercel

- Se outcom-dashboard **ainda não está no Vercel**, fazer deploy primeiro.
- Ajustar URL final no `.env.example` + `docs/google-ads-setup.md` + `api/google-ads/health.ts` (atualmente como `outcom-dashboard.vercel.app` — placeholder).

### 3. SettingsPage

O outcom-dashboard ainda não tem SettingsPage com card de Google Ads.
Pode copiar o card do plug-dashboard:
- Arquivo fonte: `~/Developer/plug-dashboard/src/pages/SettingsPage.tsx`
- Trecho relevante: seção `{/* Google Ads */}`
- Dependências: import `checkGoogleAdsConnection`, `checkGoogleAdsHealth`, `disconnectGoogleAds` de `@/lib/googleAdsApi`

## Depois disso, é seguir o mesmo setup do Plug

[docs/google-ads-setup.md](./google-ads-setup.md) (o guia já está 100% adaptado com a URL do outcom).

## Se decidir que Outcom não precisa de Google Ads em tempo real

Tudo isso é removível — a estrutura foi copiada como "espelho" do Plug pra poupar 2-3h de retrabalho futuro caso seja ativado. Se Outcom for ficar só com Meta Ads + entrada manual:

```bash
rm -rf api/ docs/google-ads-setup.md docs/google-ads-SETUP-PENDENTE.md
rm -f src/lib/googleAdsApi.ts .env.example
rm -f supabase/migrations/001_google_oauth_tokens.sql
```

Mas recomendo deixar como está — são 10 arquivos de código pronto que custam zero em runtime e podem economizar dias quando precisar.

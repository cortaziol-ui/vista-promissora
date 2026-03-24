

## Plan: Meta Ads Integration + Marketing Analytics

### Overview

Create a Meta Ads integration page in Settings (similar to the reference image) where the user inputs their Access Token, Ad Account ID, currency, and timezone. Then update the Marketing Analytics page to pull real data from Meta's Marketing API via a Supabase Edge Function proxy.

### Architecture

```text
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────┐
│  Settings Page   │────▶│  localStorage         │◀────│ Marketing   │
│  (Meta config)   │     │  meta_ads_config       │     │ Page        │
└─────────────────┘     └──────────────────────┘     └──────┬──────┘
                                                            │
                                                   fetch() to Meta API
                                                   (client-side, using
                                                    stored access token)
```

Since there is no backend (Supabase/Edge Functions), the Meta Marketing API will be called directly from the client using the user's long-lived access token stored in localStorage. This is acceptable because the token belongs to the user and is only stored locally.

### Changes

**1. New file: `src/components/MetaAdsIntegration.tsx`**

A card component matching the reference image design:
- Meta Ads header with blue icon + "Conectado" / "Desconectado" badge
- Textarea for Meta Access Token (masked display)
- Helper text: "Gere em developers.facebook.com > Tools > Graph API Explorer"
- Three fields in a row: Ad Account ID, Moeda (BRL), Timezone (America/Sao_Paulo)
- "Ultima sincronizacao" timestamp
- Three buttons: "Salvar Conexao", "Testar Conexao", "Sincronizar Agora"
- Config saved to localStorage key `meta_ads_config`
- "Testar Conexao" calls Meta API `/me?fields=id,name` to validate token
- "Sincronizar Agora" fetches campaign insights and caches them

**2. Update `src/pages/SettingsPage.tsx`**

- Import and render `<MetaAdsIntegration />` at the bottom of the settings page (admin only)

**3. New file: `src/lib/metaAdsApi.ts`**

Utility functions to call Meta Marketing API:
- `testConnection(token)` — GET `/me`
- `fetchCampaignInsights(token, adAccountId, dateRange)` — GET `/{adAccountId}/insights` with fields: impressions, clicks, spend, cpc, ctr, actions (leads, conversions)
- `fetchCampaigns(token, adAccountId)` — GET `/{adAccountId}/campaigns` with insights
- Results cached in localStorage with timestamp

**4. Update `src/pages/MarketingPage.tsx`**

- Check for Meta Ads config in localStorage
- If connected: fetch real data from Meta API using stored token and show real KPIs (impressions, clicks, spend, CPL, CPC, CTR, conversions)
- If not connected: show current mock data with a banner "Conecte sua conta Meta Ads em Configuracoes para ver dados reais"
- Replace mock leads data with Meta insights when available
- Charts update to show real campaign performance data

**5. Update `src/App.tsx`**

- No new routes needed; Meta integration lives inside the existing Settings page

**6. Update `src/components/AppSidebar.tsx`**

- No changes needed; Marketing and Settings already exist in nav

### Meta API Fields Used

- `/me` — validate token
- `/{ad_account_id}/insights` — spend, impressions, clicks, cpc, ctr, actions
- `/{ad_account_id}/campaigns` — campaign-level breakdown

### Important Notes

- Meta API supports CORS for client-side calls with a valid access token
- Long-lived tokens last ~60 days; the UI will show connection status
- If the token expires, "Testar Conexao" will fail and update the status badge to "Desconectado"
- All sensitive data (token) stays in the user's browser only




## Plan: Marketing Analytics 100% Meta Ads

### Overview

Remove all mock/simulated data from Marketing Analytics. The page will exclusively pull data from Meta Ads API. When not connected, show a prominent connection prompt instead of fake data. Replace the bottom campaign bar chart with a detailed table showing campaign name, CPC, CPL, and CTR.

### Changes

**1. `src/pages/MarketingPage.tsx` -- Full rewrite of data logic**

- Remove all mock data imports (`leads` from mockData) and mock fallback calculations
- Remove the `channel` filter (no longer relevant without mock sources)
- When Meta is NOT connected: show only the connection banner + empty state message directing to Settings -- no fake KPIs or charts
- When Meta IS connected: show all KPIs and charts from Meta data
- Auto-sync on page load when connected (call `handleSyncMeta` in useEffect when config exists)
- KPIs always from Meta: Impressions, Clicks, Investimento, CPC, CTR, Leads, CPL, Taxa de Conversao
- Replace bottom "Custo por Campanha" bar chart with a **Table** component:
  - Columns: Campanha, Custo, CPC, CPL, CTR
  - Data from `metaCampaigns` with per-campaign calculations
  - CPL per campaign = spend / leads (from campaign insights)

**2. `src/lib/metaAdsApi.ts` -- No changes needed**

Already fetches all required fields (impressions, clicks, spend, cpc, ctr, leads per campaign).

### Technical Details

- Import `Table, TableHeader, TableBody, TableRow, TableHead, TableCell` from `@/components/ui/table`
- Remove `leads` import from `@/data/mockData`
- Remove `bySource`, `leadsByDay`, `monthLeads`, `sources`, `channel` state
- Campaign table CPL calculation: `campaign.insights.spend / (campaign.insights.leads || 1)`
- Auto-sync triggers on mount + when year/month changes (with debounce via useEffect deps)


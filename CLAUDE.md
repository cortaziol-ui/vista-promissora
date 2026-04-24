# outcom-dashboard

## Stack
- **Frontend:** React 18 + TypeScript + Vite
- **UI:** Tailwind CSS + shadcn/ui (Radix) + Lucide icons
- **State/Data:** React Query (TanStack) + React Context
- **Forms:** React Hook Form + Zod
- **Backend:** Supabase (Postgres + Auth + Edge Functions)
- **Deploy:** Vercel (auto-deploy do branch `main`)

## Deploy & Workflow
- O app roda em **Vercel**. Edições locais **não aparecem em produção** até fazer `git push origin main`.
- Após qualquer mudança, lembrar o usuário de fazer push para que o deploy aconteça.
- Build command: `npm run build` (output em `dist/`)
- SPA com rewrite: todas as rotas caem em `index.html`

## Dev Local
```bash
npm run dev        # Vite dev server na porta 8080
npm run build      # Build de produção
npm run test       # Vitest (testes unitários)
```

## Supabase
- **Project ID:** `xfubszxlacwlcngejpec`
- **Client:** `src/integrations/supabase/client.ts` (auto-gerado, NÃO editar)
- **Types:** `src/integrations/supabase/types.ts` (auto-gerado, NÃO editar)
- **Migrations:** `supabase/migrations/` (criar novos arquivos aqui para mudanças no banco)
- **Edge Functions:** `supabase/functions/` (runtime Deno, NÃO Node.js)
- **Env vars frontend:** prefixo `VITE_` obrigatório (ex: `VITE_SUPABASE_URL`)

## Estrutura do Projeto
```
src/
├── pages/           # Páginas/rotas (Index, Login, Overview, Sales, Marketing, Financial, etc.)
├── components/      # Componentes (ui/ = shadcn, resto = custom)
├── contexts/        # AuthContext, AccountContext, SalesDataContext
├── hooks/           # Custom hooks (useCommissionTiers, useCampaignLinks, etc.)
├── lib/             # Utilitários (metaAdsApi, campaignMatcher, vendorLeads)
└── integrations/    # Supabase client e types (auto-gerados)
```

## Convenções
- **Componentes UI:** usar shadcn/ui (`@/components/ui/`). Não criar componentes genéricos do zero.
- **Toasts/notificações:** Sonner (`sonner`)
- **Data fetching:** React Query (`useQuery`, `useMutation`)
- **Validação:** Zod schemas
- **Imports:** usar alias `@/` (resolve para `src/`)
- **Idioma da UI:** Português (PT-BR)

## Workflow TDD (obrigatório para novas features)

Ao implementar qualquer feature ou fix no dashboard, seguir este pipeline:

1. **Ler** o código existente relacionado à mudança
2. **Escrever testes primeiro** cobrindo: funcionalidade esperada, edge cases, validação de dados
3. **Rodar `npx vitest run`** — os testes novos devem FALHAR (red)
4. **Implementar** a feature/fix
5. **Rodar `npx vitest run` em loop** — se falhar, corrigir e re-rodar até ALL PASS (green)
6. **Rodar `npm run build`** — verificar que não há erros de build
7. **Fazer push automático** — `git add . && git commit -m '[feature] descrição' && git push`

**Nunca pedir ao Leandro para rodar comandos git.** Executar diretamente.

### Estrutura de testes
```
src/lib/__tests__/        # Testes de utilitários (dateUtils, campaignMatcher, vendorLeads)
src/components/__tests__/ # Testes de componentes (quando necessário)
src/hooks/__tests__/      # Testes de hooks (quando necessário)
```

### Cobertura atual (2026-04-12)
- `dateUtils.ts` — ✅ 10 testes
- `campaignMatcher.ts` — ✅ 8 testes
- `vendorLeads.ts` — ✅ 4 testes (+ 1 placeholder removido)

## Regras Importantes
1. **NUNCA** editar `src/integrations/supabase/client.ts` ou `types.ts` — são auto-gerados
2. Mudanças no banco de dados devem ser feitas via migrations em `supabase/migrations/`
3. Edge Functions usam **Deno** (imports com URL, não `npm`)
4. Após editar código, o hook em `.claude/settings.json` faz auto-commit + push para deploy
5. O path alias `@` aponta para `src/` — usar em todos os imports

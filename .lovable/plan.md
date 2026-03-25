

## Plano: Migrar Tudo para Banco de Dados (Supabase) + Corrigir Meta Ads

### Resumo

Dois blocos de trabalho:
1. **Migrar dados de localStorage/mock para Supabase** (vendedores, clientes, metas, NPS, auth)
2. **Criar Edge Function como proxy para Meta Ads** — resolve o erro de permissão (o token sendo enviado diretamente do navegador pode ser bloqueado por restrições de origem/app) e melhora segurança

---

### Bloco 1: Banco de Dados com Lovable Cloud

**Tabelas a criar:**

```text
vendedores
├── id (uuid, PK)
├── user_id (uuid, FK auth.users, nullable)
├── nome (text)
├── cargo (text)
├── meta (numeric)
├── avatar (text)
├── created_at (timestamptz)

clientes
├── id (uuid, PK)
├── data (text) -- formato DD/MM/YYYY
├── nome (text)
├── cpf (text)
├── nascimento (text)
├── email (text)
├── telefone (text)
├── servico (text) -- LIMPA NOME, RATING, OUTROS
├── vendedor (text) -- nome do vendedor
├── entrada (numeric)
├── parcela1_valor (numeric)
├── parcela1_status (text)
├── parcela1_data_pagamento (text, nullable)
├── parcela2_valor (numeric)
├── parcela2_status (text)
├── parcela2_data_pagamento (text, nullable)
├── situacao (text)
├── valor_total (numeric)
├── created_at (timestamptz)

company_settings
├── id (uuid, PK)
├── meta_mensal (numeric)
├── key (text, unique)
├── value (jsonb)

nps_entries
├── id (uuid, PK)
├── date (date)
├── score (integer)
├── comment (text)
├── created_at (timestamptz)
```

**Autenticação:**
- Migrar de hardcoded users para Supabase Auth
- Criar tabela `user_roles` com enum (admin, manager, seller) seguindo o padrão de segurança
- Seed dos usuários existentes (Caio, Cunha, Bianca, etc.) via Supabase Auth
- Manter o mesmo fluxo de login (email + senha)

**SalesDataContext:**
- Substituir localStorage por queries Supabase (select, insert, update, delete)
- Usar React Query para cache e invalidação
- Manter a mesma interface do contexto para não quebrar nenhuma página

**Páginas afetadas:**
- `SatisfactionPage.tsx` — trocar `npsEntries` mock por query Supabase
- Todas as outras já usam `useSalesData()` — funcionam automaticamente após migrar o contexto
- Deletar `src/data/mockData.ts`

---

### Bloco 2: Edge Function Proxy para Meta Ads

O erro `(#200) Ad account owner has NOT grant ads_management or ads_read permission` ocorre porque o token está sendo enviado diretamente do navegador. Quando o App do Meta está em modo desenvolvimento, a chamada pode ser rejeitada dependendo da origem. Uma Edge Function resolve isso:

**Edge Function `meta-ads-proxy`:**
- Recebe do frontend: `adAccountId`, `dateRange`
- Armazena o Access Token como **secret** no Supabase (nunca exposto no browser)
- Faz a chamada para `graph.facebook.com` server-side
- Retorna os dados para o frontend

**Mudanças no frontend:**
- `metaAdsApi.ts` — trocar `fetch(graph.facebook.com)` por `supabase.functions.invoke('meta-ads-proxy')`
- `MetaAdsIntegration.tsx` — ao salvar token, enviar para o secret store via edge function em vez de localStorage
- Remover token do localStorage (segurança)

---

### Ordem de Execução

1. Habilitar Lovable Cloud / Supabase
2. Criar migrations (tabelas + RLS + roles)
3. Seed dos dados iniciais (vendedores, clientes existentes)
4. Migrar AuthContext para Supabase Auth
5. Migrar SalesDataContext para queries Supabase
6. Migrar SatisfactionPage (NPS)
7. Criar Edge Function `meta-ads-proxy`
8. Atualizar `metaAdsApi.ts` para usar o proxy
9. Deletar `mockData.ts` e limpar imports
10. Testar fluxo completo

### Nota sobre o erro do Meta Ads

Mesmo que as permissões estejam corretas no painel do Meta, chamadas diretas do navegador (client-side) para a Marketing API podem ser bloqueadas quando o App está em modo desenvolvimento. O proxy via Edge Function resolve isso porque a requisição parte de um servidor, não do browser do usuário.


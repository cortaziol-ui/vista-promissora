

## Diagnóstico

Identifiquei dois problemas que podem causar falha ao salvar/carregar dados do Meta:

### Problema 1: `.single()` na MarketingPage (linha 33)
A MarketingPage usa `.single()` ao carregar o token do `app_settings`. Se o token ainda não foi salvo, `.single()` retorna erro 406 (nenhuma linha encontrada), impedindo o carregamento correto. Precisa ser `.maybeSingle()`.

### Problema 2: AccountContext não trata erros de RLS
O `addAccount` no AccountContext faz insert em `meta_accounts`, mas a tabela só permite escrita para admins. O código não mostra erro claro se falhar por permissão. Além disso, o `switchAccount` faz dois updates sequenciais sem tratamento de erro.

---

## Correções

### 1. MarketingPage — `.single()` → `.maybeSingle()`
Linha 33: trocar `.single()` por `.maybeSingle()` na query de `app_settings`.

### 2. AccountContext — tratamento de erros
Adicionar try/catch nos métodos `switchAccount` e `deleteAccount` para que erros de RLS não falhem silenciosamente.

### 3. SyncSection — tratamento de erro na query do token
Na SyncSection do MetaAdsIntegration, a query do token (linha 132-136) também usa `.maybeSingle()` — confirmar que está correto e adicionar tratamento de erro.

---

### Arquivos alterados
- `src/pages/MarketingPage.tsx` — linha 33
- `src/contexts/AccountContext.tsx` — métodos switchAccount, deleteAccount


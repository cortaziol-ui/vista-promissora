

## Diagnóstico

A tela fica no spinner de carregamento infinito. Há dois problemas:

1. **AuthContext pode travar**: Se `fetchUserRole()` ou `fetchSellerName()` falharem (ex: erro de rede), o `setLoading(false)` nunca é chamado porque está depois do `await` — a Promise rejeita e o loading fica `true` para sempre.

2. **Edge Function CORS incompleto**: Os headers CORS do `meta-ads-proxy` estão faltando headers obrigatórios do Supabase client (`x-supabase-client-platform`, etc.), o que pode causar falha na chamada de sincronização.

3. **MarketingPage não mostra estado de loading/erro**: Quando a sincronização falha silenciosamente, a página mostra dados vazios sem feedback.

## Plano

### 1. Corrigir AuthContext — impedir loading infinito

**Arquivo**: `src/contexts/AuthContext.tsx`

- Envolver os `await fetchUserRole()` e `await fetchSellerName()` em try/catch
- Garantir que `setLoading(false)` é chamado mesmo se as queries falharem
- Fallback: se fetchUserRole falhar, usar role `'seller'` como padrão

### 2. Corrigir CORS da Edge Function

**Arquivo**: `supabase/functions/meta-ads-proxy/index.ts`

- Atualizar `Access-Control-Allow-Headers` para incluir todos os headers necessários:
  `authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version`

### 3. Adicionar feedback visual na MarketingPage

**Arquivo**: `src/pages/MarketingPage.tsx`

- Mostrar spinner enquanto `syncing` está ativo
- Mostrar mensagem de erro se a sincronização falhar (guardar erro no estado)
- Se não há dados e não está sincronizando, mostrar botão para tentar novamente

### Detalhes Técnicos

```typescript
// AuthContext fix - wrap in try/catch
supabase.auth.getSession().then(async ({ data: { session } }) => {
  if (session?.user) {
    try {
      const role = await fetchUserRole(session.user.id);
      const sellerName = await fetchSellerName(session.user.id);
      setUser(buildUser(session.user, role, sellerName));
    } catch (e) {
      console.error('Error fetching user data:', e);
      setUser(buildUser(session.user, 'seller'));
    }
  }
  setLoading(false);
});
```


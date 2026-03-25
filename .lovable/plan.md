

## Diagnóstico

A conexão com `/me` funciona (200 OK), mas o endpoint de insights retorna 403. Analisando o código, há dois problemas potenciais:

1. **`time_range` não está URL-encoded** — o `JSON.stringify(dateRange)` produz `{"since":"2026-03-01","until":"2026-03-25"}` direto na URL sem encoding. As chaves `{}` e aspas não são caracteres válidos em URLs e alguns servidores rejeitam isso.

2. **URL da campanha usa sintaxe incorreta** — na linha que busca campanhas, o código usa `insights.time_range(${JSON.stringify(dateRange)})` com parênteses, que é uma sintaxe de field expansion do Graph API que pode causar problemas.

3. **A versão v21.0 está correta** (é recente e válida).

O erro 403 com essa mensagem específica pode ocorrer quando o token foi gerado no Graph API Explorer **sem selecionar o Ad Account** no dropdown "User or Page" — o token precisa ser gerado com o ad account selecionado. Mas, para garantir que o código está correto, vamos corrigir o encoding.

## Plano

### Arquivo: `src/lib/metaAdsApi.ts`

- **URL-encode o `time_range`** em ambas as chamadas (insights e campaigns) usando `encodeURIComponent(JSON.stringify(dateRange))`
- **Melhorar mensagem de erro** quando o erro for de permissão (código 200 do Meta) — mostrar instrução específica sobre como gerar o token com as permissões corretas
- **Adicionar log do erro completo** no console para debugging

### Nota para o usuário

Mesmo com a correção de encoding, se o erro persistir, o problema é que no **Graph API Explorer** ao gerar o token, é preciso:
1. Selecionar o **App** correto
2. No dropdown **"User or Page"**, selecionar a **Ad Account** (act_444755956144435)
3. Marcar as permissões `ads_read` e `ads_management`
4. Clicar em **"Generate Access Token"**


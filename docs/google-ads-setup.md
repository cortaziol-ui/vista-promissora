# Google Ads API — Setup Completo

Passo a passo pra ligar a integração **Google Ads em tempo real** no plug-dashboard.

**Tempo total humano:** ~60 min (fora a espera do Developer Token, que é 5-14 dias úteis).
**Custo:** R$ 0/mês (tudo em tier gratuito).

---

## 0. Antes de começar — pré-requisitos

- [ ] Conta Google Ads MCC (Manager) ativa
- [ ] Spend histórico ≥ $1.000 USD acumulado nas contas da MCC (requisito do Google pra Developer Token Basic)
- [ ] Conta Vercel com o projeto `plug-dashboard` já deployado
- [ ] Email do Leandro que será usado como Test User OAuth

---

## 1. 🔴 Solicitar Developer Token (Trilha Longa — PRIMEIRO)

**Tempo de espera:** 5-14 dias úteis. **Faça isso primeiro pra não bloquear o resto.**

1. Abrir **Google Ads** logado na conta MCC
2. Menu superior → **Tools** → **API Center**
3. Aceitar Termos de Serviço da API
4. **Request access level: Basic** (15k ops/dia, suficiente pra múltiplos clientes)
5. Preencher formulário. Justificativa sugerida:

   > Dashboard interno da agência Beaver Growth para visualizar métricas de campanhas de 2 clientes ativos (Plug Brasília e Outcom). Uso exclusivamente interno, sem redistribuição de dados. Aplicação não pública (apenas administradores da agência acessam).

6. Aguardar e-mail do Google (5-14 dias úteis). Resposta vem no email da conta MCC.

**Enquanto espera:** seguir pros passos 2-5 (podem ser feitos em paralelo).

---

## 2. 🟡 Google Cloud Project + OAuth 2.0 Client (20 min)

1. Abrir **https://console.cloud.google.com**
2. Criar projeto novo: **"Beaver Dashboard"**
3. Menu lateral → **APIs & Services** → **Library**
4. Buscar **"Google Ads API"** → **Enable**
5. Voltar pra **APIs & Services** → **OAuth consent screen**
   - User Type: **External**
   - App name: **Beaver Dashboard**
   - User support email + Developer contact: seu email
   - Publishing status: deixar em **Testing** (suficiente pra uso interno)
   - **Test users → Add**: adicionar o email do Leandro que vai fazer OAuth
6. Ir em **Credentials** → **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: **Beaver Dashboard Web**
   - Authorized redirect URIs:
     - `https://outcom-dashboard.vercel.app/api/google-ads/callback`
     - (opcional dev) `http://localhost:3000/api/google-ads/callback`
   - Create
7. **Copiar Client ID + Client Secret** (aparece num modal — salvar num lugar seguro)

**⚠️ Sobre verificação de app:** modo **Testing External** não exige verificação formal do Google. O usuário só vê um warning "Google hasn't verified this app" no primeiro login e clica em "Advanced" → "Go to Beaver Dashboard (unsafe)". **Aceitável pra uso interno.**

---

## 3. 🟡 Supabase Project (10 min)

1. Abrir **https://app.supabase.com** → **New Project**
2. Name: **beaver-dashboard**
3. Region: **South America (São Paulo)**
4. Database password: gerar e salvar em lugar seguro
5. Create (~2 min pra provisionar)
6. Quando pronto, ir em **Project Settings → API**:
   - Copiar **Project URL** → vai virar `SUPABASE_URL`
   - Copiar **service_role** key (a secreta, não a `anon`) → vai virar `SUPABASE_SERVICE_ROLE_KEY`
7. Ir em **SQL Editor** → **New Query**:
   - Colar o conteúdo de [`supabase/migrations/001_google_oauth_tokens.sql`](../supabase/migrations/001_google_oauth_tokens.sql)
   - **Run**
   - Confirma que não deu erro

---

## 4. 🟡 Customer ID da conta Google Ads (1 min)

1. Abrir **Google Ads** logado
2. Canto superior direito: ID no formato `123-456-7890`
3. **Remover os hífens** → vira `1234567890`
4. Salvar pra usar como `GOOGLE_ADS_LOGIN_CUSTOMER_ID`

Se a conta que você quer ver é gerida por uma MCC, use o ID da **MCC** aqui (e a API vai conseguir ver todas as child accounts).

---

## 5. 🟡 Vercel Environment Variables (10 min)

1. Abrir **Vercel Dashboard** → projeto `plug-dashboard`
2. **Settings** → **Environment Variables**
3. Adicionar cada variável abaixo (escopo: **Production + Preview + Development** nas 3 marcadas):

| Nome | Valor | Vem de |
|------|-------|--------|
| `GOOGLE_CLIENT_ID` | `xxxx.apps.googleusercontent.com` | Passo 2 |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxx` | Passo 2 |
| `GOOGLE_REDIRECT_URI` | `https://outcom-dashboard.vercel.app/api/google-ads/callback` | Passo 2 (exato!) |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | (aguardar passo 1 aprovado) | Passo 1 |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | `1234567890` | Passo 4 |
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Passo 3 |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Passo 3 |

4. **Redeploy** (Deployments → ... → Redeploy)

---

## 6. ✅ Validar conexão (2 min)

1. Abrir `https://outcom-dashboard.vercel.app/api/google-ads/health`
2. Deve retornar JSON. Esperado inicialmente:
   ```json
   {
     "status": "missing_config",
     "missing": ["oauth_refresh_token"],
     "nextStep": "Clicar em 'Conectar Google Ads' na SettingsPage (fluxo OAuth)"
   }
   ```
3. Ir na **SettingsPage** do dashboard
4. Clicar em **"Conectar Google Ads"** — vai abrir fluxo OAuth Google
5. Autorizar (mesmo o warning "unverified app" — clicar Advanced → Continue)
6. Voltar e verificar: `/api/google-ads/health` agora retorna `status: "ready"`
7. Abrir **GoogleAdsPage** — deve mostrar campanhas reais

---

## 7. Quando o Developer Token for aprovado (dia 5-14)

1. Copiar o token do email do Google
2. Adicionar/atualizar `GOOGLE_ADS_DEVELOPER_TOKEN` no Vercel
3. Redeploy
4. Testar `/api/google-ads/health` → deve estar "ready"

---

## Troubleshooting

### "Invalid redirect_uri"
A `GOOGLE_REDIRECT_URI` no Vercel precisa bater **EXATAMENTE** com a cadastrada no OAuth Client (incluindo `https://`, sem barra final, sem `www`).

### "Developer token is not approved"
O token está em modo Test (só consulta conta de teste). Esperar aprovação Basic.

### "User does not have access"
O email que fez OAuth precisa estar listado como Test User no OAuth consent screen. Adicionar e refazer.

### "Refresh token expirou"
Em modo Testing, refresh_token expira em 7 dias se scope for "sensitive" (caso do `adwords`).
**Solução:** ir no OAuth consent screen → **Publish app** → In production (aceitar warning sobre verificação não finalizada; uso interno é OK).

### "Timeout after 30s"
Conta com muitas campanhas pode estourar timeout. Se recorrente, quebrar query por campanha ou adicionar cache.

---

## Arquitetura — o que cada env var faz

- **`GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`**: identidade do app junto ao OAuth Server do Google
- **`GOOGLE_REDIRECT_URI`**: URL pra onde o Google manda o usuário depois do OAuth
- **`GOOGLE_ADS_DEVELOPER_TOKEN`**: chave de acesso à Google Ads API (header em toda request)
- **`GOOGLE_ADS_LOGIN_CUSTOMER_ID`**: MCC usado pra operar contas child
- **`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`**: onde guardar o refresh_token persistente

---

## Custo

- Google Cloud Project: **R$ 0** (free tier, Google Ads API não cobra)
- Google Ads Developer Token: **R$ 0**
- Supabase Free: **R$ 0** (500MB DB + 50MB storage, suficiente pra 1 row)
- Vercel: **já pago** (sem custo adicional)

**Total: R$ 0/mês.**

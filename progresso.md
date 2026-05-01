---
title: "Progresso — Outcom Dashboard 2"
projeto: "outcom-dashboard"
tipo: progresso
criado: 2026-05-01
updated: 2026-05-01
tags:
  - progresso
  - outcom
---

# Progresso — Outcom Dashboard 2 (multi-tenancy)

> Repo: `~/Developer/outcom-dashboard`
> Stack: React + TS + Vite + Supabase + Tailwind/shadcn
> Multi-tenant: SIM (account_id em todas as tabelas)

**Ultima atualizacao:** 2026-05-01

---

## Como usar este arquivo

Fonte unica de verdade sobre o que foi implementado de fato.
- `[x]` = implementado e validado por typecheck
- `[ ]` = pendente / pendente de validacao em prod
- Cada sessao de trabalho DEVE atualizar os checkboxes e adicionar linha no Log de Sessoes

Para reconstruir o historico completo anterior a este arquivo, usar `git log`.

---

## Roleta — Controle de Status e Quantidade Entregue (sessao 2026-05-01)

### Backend (Supabase)
- [x] Migration `20260501200000_roleta_spins_quantidade.sql` adiciona `quantidade_total` e `quantidade_entregue` em `roleta_spins`
- [x] Constraint `roleta_spins_quantidade_check` (total >= 1, entregue entre 0 e total)
- [x] Policy `account_update_roleta_spins` agora libera UPDATE para `admin` (Caio dono) E `manager` (gerente)
- [x] Migration aplicada em producao (`supabase db push --linked` rodado em 2026-05-01)

### Frontend
- [x] Helper `src/lib/prizeQuantity.ts` extrai quantidade do label do premio via regex (ignora `R$ XX`)
- [x] `useRoletaSpins.ts`: interface ganha `quantidadeTotal` e `quantidadeEntregue`
- [x] `useRoletaSpins.ts`: `saveSpin` calcula `quantidadeTotal` automaticamente via `parsePrizeQuantity`
- [x] `useRoletaSpins.ts`: nova funcao `updateSpin(id, { status?, quantidadeEntregue? })` com auto-derivacao de status
- [x] `RoletaPage.tsx`: badge de status agora e clicavel (toggle pendente <-> pago) quando premio e unidade unica
- [x] `RoletaPage.tsx`: contador `[-] N/Total [+]` aparece quando `quantidadeTotal > 1`; ao chegar no total, status vira `pago` automatico
- [x] Permissao: edicao habilitada para `admin` ou `manager`; vendedor nao ve nem edita
- [x] Historico "Ultimas Giradas" agora visivel para manager (antes era so admin)

### Validacao
- [x] Typecheck do meu codigo: zero erros novos
- [x] Sanity check da regex `parsePrizeQuantity` com 12 casos (Pack 6, 2 marmitas, Pix R$ 50, etc.)
- [ ] Build/preview no navegador (proximo passo)
- [ ] Testar em prod com user manager real

---

## Infraestrutura — Supabase CLI (sessao 2026-05-01)

- [x] `SUPABASE_ACCESS_TOKEN` salvo em `~/.zshrc` (auth persistente, nunca mais precisa `supabase login`)
- [x] `supabase link` feito nos dois repos (outcom-dashboard e outcom-dashboard-snapshot) apontando pro projeto `vmgopulfmdkpdyazblve`
- [x] `migration repair --status applied` em todas as 27+19 migrations antigas (que tinham sido aplicadas via SQL Editor sem registro no tracking)
- [x] A partir de hoje, novas migrations: criar arquivo `.sql` em `supabase/migrations/` e rodar `supabase db push --linked`. Sem mais cola manual.

## Blockers

_Sem blockers ativos._

---

## Log de Sessoes

| Data | Sessao | O que foi feito | Proximos passos |
|------|--------|----------------|-----------------|
| 2026-05-01 | Roleta: status e contador | Migration + helper parsePrizeQuantity + updateSpin no hook + UI inline (toggle status / contador unidades) com permissao admin+manager. Replicado no snapshot. Migration aplicada em prod via `supabase db push`. CLI Supabase configurado com access token persistente. | Testar no navegador com user manager real |
| 2026-05-01 | Roleta: filtro de data | Filtro de periodo na secao "Ultimas Giradas": presets 7d/14d/30d/tudo + periodo personalizado (de/ate) + atalho "Hoje". Default: 7d. Limite de 50 itens com aviso quando o filtro retornar mais. Replicado no snapshot. | Testar no navegador |

---

_Atualizar a cada sessao de trabalho._

---
title: "Progresso — Outcom Dashboard 2"
projeto: "outcom-dashboard"
tipo: progresso
criado: 2026-05-01
updated: 2026-05-15
tags:
  - progresso
  - outcom
---

# Progresso — Outcom Dashboard 2 (multi-tenancy)

> Repo: `~/Developer/outcom-dashboard`
> Stack: React + TS + Vite + Supabase + Tailwind/shadcn
> Multi-tenant: SIM (account_id em todas as tabelas)

**Ultima atualizacao:** 2026-05-15

---

## Filtro de Servico em Marketing (sessao 2026-05-07)

> **Pedido do Caio:** separar metricas de marketing por servico (Limpa Nome vs Rating). Investimento, leads, CAC, conversao etc. vinham agregados (geral) sem distincao.

### Frontend
- [x] `src/lib/serviceTypes.ts`: helpers `detectCampaignService(name)` e `isCampaignInService(name, serviceType)`
  - Heuristica por nome de campanha: procura "RATING" / "LIMPA NOME" / "LIMPA-NOME" / "LIMPANOME" / token isolado `\bLN\b` / `\bRT\b`
- [x] `OverviewPage.tsx`: segmented filter Geral/Limpa Nome/Rating no header
  - `useMonthlyData(selectedMonth, serviceFilter)` ja recebe servico
  - Substituido `metaInsights` (state) por `metaCampaigns` (state) + `metaInsights` derivado em `useMemo` filtrando por servico
  - KPIs: Investimento, Leads, CAC (Spend/Vendas), Conversao (Vendas/Leads), Impressoes, CPL — todos respeitam servico
- [x] `MarketingPage.tsx`: segmented filter Geral/Limpa Nome/Rating no header
  - Removido state `metaInsights`; KPIs (impressoes, cliques, CTR, leads, conversao, investimento, CPC, CPL, CAC) recalculados em `useMemo` a partir de `metaCampaigns` filtradas
  - `campaigns`, `ranking`, `vendorData` e tabela "Campanhas — Decisao Rapida" ja recebem o array filtrado
- [x] Filtro persiste em `localStorage` com a mesma chave da SalesPage (`SERVICE_FILTER_STORAGE_KEY`) — selecao sincronizada entre paginas
- [x] **Filtro funciona retroativo:** como tudo deriva de `(mes selecionado, serviceFilter)`, qualquer mes passado tambem respeita o recorte

### Validacao
- [x] `npx tsc --noEmit` sem erros
- [x] `npm run build` passou (warning de @import de fonte ja existia, nao relacionado)
- [x] Commit + push para producao Lovable (commit `74af037`)
- [ ] Testar em prod com Caio: confirmar nomenclatura das campanhas no Meta bate com a heuristica (Limpa Nome / Rating no nome)

---

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
| 2026-05-15 | Planilha pra vendedor (read-only) + PDF + auditoria marketing | (1) Urgencia do Caio via WhatsApp: vendedores precisavam acessar Planilha de Controle pra consultar, sem editar nada. Role `seller` adicionada em `/planilha` (sidebar + App.tsx). `PlanilhaPage` detecta `isSeller -> readOnly`: esconde "Novo Cliente" e "Editar em Massa", substitui Pencil/Trash por Eye na coluna de acoes, modal abre em modo somente-leitura (`pointer-events: none`, sem botao Salvar, titulo "Detalhes do Cliente"). `KanbanPosVenda` recebe prop `readOnly` via `isSeller`: `useDraggable({ disabled: true })`, botao "marcar feito" some (mantem so o icone verde estatico quando contato esta feito), botao Settings de configurar fase some, `handleDragEnd` faz early-return. RLS no banco ja bloqueia (`account_manage_clientes` nao inclui seller, `kanban_phases` admin-only) — nao precisou migration. (2) Bonus pedido: export PDF via `window.print` de HTML formatado (A4 landscape, header navy Outcom, 17 colunas, valores monetarios alinhados a direita). (3) Commit pendente que estava no working tree: painel de auditoria de classificacao por campanha em MarketingPage (mostra como `detectCampaignService` classificou cada campanha como LIMPA NOME / RATING / GERAL, filtro "apenas nao classificadas"). Commits `21eb177` (auditoria marketing) + `a934761` (read-only seller + PDF) pushed pra main. | Caio testar em prod (vendedor das duas contas): item "Planilha de Controle" aparece na sidebar; abre sem botoes de edicao; modal abre como leitura; kanban nao arrasta; menu Exportar > PDF abre print dialog. |
| 2026-05-01 | Roleta: status e contador | Migration + helper parsePrizeQuantity + updateSpin no hook + UI inline (toggle status / contador unidades) com permissao admin+manager. Replicado no snapshot. Migration aplicada em prod via `supabase db push`. CLI Supabase configurado com access token persistente. | Testar no navegador com user manager real |
| 2026-05-01 | Roleta: filtro de data | Filtro de periodo na secao "Ultimas Giradas": presets 7d/14d/30d/tudo + periodo personalizado (de/ate) + atalho "Hoje". Default: 7d. Limite de 50 itens com aviso quando o filtro retornar mais. Replicado no snapshot. | Testar no navegador |
| 2026-05-01 | vendedores.inactive_from (desativacao preservando historico) | Nova coluna `vendedores.inactive_from DATE`. Quando setada, vendedor some de dropdowns de selecao a partir de hoje e some de rankings/splits LN/RT a partir do mes da data; vendas/comissoes/spins anteriores continuam intactos. Migration `20260501400000_vendedores_inactive_from.sql` cria coluna + UPDATE inativando Lucas (Cunha) em 2026-05-01. Helpers `isVendorActiveToday` / `isVendorActiveInMonth` em `src/lib/vendorActive.ts`. Aplicado em FilterBar, SalesPage (dropdown + aniversariantes), PlanilhaPage (form novo cliente + bulk vendedor), RoletaPage (selecao pra girar), useMonthlyData (vendedorStats), SettingsPage (badge visual "Inativo"). Build OK, typecheck OK, commit local `993e5b9` (push pra main bloqueado). Migration nao foi aplicada (push direto bloqueado tambem). | Push manual pra main + `supabase db push --linked` ou colar SQL no Editor. |
| 2026-05-04 | Documentos: filtro de mês corrigido | Bug reportado pelo Caio: navegacao de mes em Limpa Nome / Rating mudava so o label, listava todas as pastas independente do mes. Fix em `DocumentManager.tsx` (linhas 454-481): na raiz, filtra `filteredFolders` pela data da venda do cliente correspondente (`clienteDataByName`) — pasta so aparece no mes em que a venda foi feita. Build OK, push direto pra main (Lovable rebuilds). Pastas sem match na tabela `clientes` ficam ocultas em todos os meses. | Caio testar em prod. Se pasta valida sumir, investigar match de nome (normalizeForMatch). |
| 2026-05-04 | Acompanhamento Processos Limpa Nome (réplica M12) | Réplica do sisteminha https://listasparceirosm12.netlify.app/ como página interna do dashboard com identidade visual Outcom (navy + glassmorphism). **Backend**: migration `20260504000000_listas_parceiros.sql` com 2 tabelas (`listas_parceiros` + `listas_parceiros_orgaos`), RLS por account (admin/manager gerenciam, todos da account leem), policy `anon SELECT` via `slug_publico` para link público, triggers de `updated_at` que tocam a lista pai quando órgão muda, realtime habilitado nas duas tabelas. Slug público é random gerado via `gen_random_uuid()`. **Frontend**: hook `useListasParceiros` com CRUD + realtime + helper `tituloDefaultProximaSexta()` que sugere "Lista DD/MM" da próxima sexta automaticamente; componente compartilhado `ListaParceirosView` reaproveitado por interno e público (prop `editable` controla se status é clicável); página `/listas-parceiros` (admin/manager/administrativo/financeiro) layout 2-colunas: esquerda = filtro por status + cards de lista com edit inline de título / copiar link / remover; direita = detalhes com badge de status geral clicável + grid 2 colunas de órgãos onde cada status é toggle dropdown (4 opções: Aguardando início, Iniciadas, Concluídas, Em reprotocolo) com auto-preenchimento de data/hora ao avançar. Status do órgão usa cores M12: âmbar (aguardando), sky (iniciadas), emerald (concluídas), zinc (protocolo). Página pública `/lista/:slug` (sem auth) com header Out.com clean institucional + realtime + footer institucional. Botão "Copiar link público" em cada card e na header da seleção. **Aplicado**: build OK, typecheck OK, dev server rodando em http://localhost:8080/. Migration **NÃO** aplicada ainda em prod e código **NÃO** pushado pra main — Leandro precisa decidir. | **Leandro:** (1) testar localmente em http://localhost:8080/listas-parceiros após o login; (2) `cd ~/Developer/outcom-dashboard && supabase db push --linked` pra criar as tabelas em prod; (3) `git push origin main` pra disparar deploy Vercel. Após isso, testar criação de nova lista, edit de status por órgão, copiar link público e abrir em aba anônima. |

---

_Atualizar a cada sessao de trabalho._

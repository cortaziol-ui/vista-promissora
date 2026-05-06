-- ============================================================
-- fichas_rating: campos do cônjuge (condicionais ao estado_civil)
-- ============================================================
-- Quando o cliente preenche o forms público (/ficha-rating) e marca
-- estado_civil = 'Casado(a)', precisamos coletar dados do cônjuge.
-- Necessário pra avaliação de rating quando há regime de comunhão.
--
-- Colunas nullable, sem default. Fichas legadas (criadas antes desta
-- migration) seguem funcionando com NULL nessas colunas — o front trata
-- como "não exibe" no detalhe.

ALTER TABLE public.fichas_rating
  ADD COLUMN IF NOT EXISTS conjuge_nome TEXT,
  ADD COLUMN IF NOT EXISTS conjuge_cpf TEXT,
  ADD COLUMN IF NOT EXISTS conjuge_rg TEXT;

COMMENT ON COLUMN public.fichas_rating.conjuge_nome IS
  'Nome completo do cônjuge. Preenchido apenas quando estado_civil = "Casado(a)".';
COMMENT ON COLUMN public.fichas_rating.conjuge_cpf IS
  'CPF do cônjuge. Preenchido apenas quando estado_civil = "Casado(a)".';
COMMENT ON COLUMN public.fichas_rating.conjuge_rg IS
  'RG do cônjuge. Preenchido apenas quando estado_civil = "Casado(a)".';

-- ============================================
-- Isolar arquivos de Limpa Nome em subpasta própria
-- ============================================
-- Contexto: antes, Limpa Nome usava a raiz do bucket (pathPrefix: '')
-- e Rating usava 'rating/'. Isso fazia Limpa Nome enxergar a pasta
-- 'rating' como se fosse dela, causando vazamento entre as duas views.
--
-- Esta migration move todos os arquivos existentes na raiz do bucket
-- 'documentos' para dentro de 'limpa-nome/', mantendo Rating intacto.
-- ============================================

UPDATE storage.objects
SET name = 'limpa-nome/' || name
WHERE bucket_id = 'documentos'
  AND name NOT LIKE 'rating/%'
  AND name NOT LIKE 'limpa-nome/%';

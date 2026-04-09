-- Storage bucket para documentos de clientes (organizado por mês/cliente/tipo)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  false,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Authenticated pode fazer upload
CREATE POLICY "authenticated_upload_documentos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos');

-- Authenticated pode ler/baixar
CREATE POLICY "authenticated_read_documentos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos');

-- Authenticated pode deletar
CREATE POLICY "authenticated_delete_documentos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documentos');

-- Authenticated pode atualizar (upsert)
CREATE POLICY "authenticated_update_documentos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documentos');

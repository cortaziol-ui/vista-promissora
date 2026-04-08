-- Tabela para fichas de rating (formulário público PF)
CREATE TABLE public.fichas_rating (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',

  -- Dados Pessoais
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL,
  rg TEXT,
  titulo_eleitor TEXT,
  data_expedicao TEXT,
  data_nascimento TEXT,
  estado_civil TEXT,
  nome_pai TEXT,
  nome_mae TEXT,

  -- Endereço
  cep TEXT,
  endereco TEXT,
  numero TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,

  -- Contato
  tel_residencial TEXT,
  tel_celular TEXT,
  email TEXT,

  -- Dados Profissionais
  empresa TEXT,
  data_admissao TEXT,
  salario NUMERIC,
  renda_familiar NUMERIC,
  faturamento NUMERIC,

  -- Bancos e Instituições (JSONB array)
  bancos JSONB DEFAULT '[]'::jsonb,

  -- Referências Pessoais (JSONB array)
  referencias JSONB DEFAULT '[]'::jsonb,

  -- Acesso Serasa
  login_serasa TEXT,
  senha_serasa TEXT,

  -- Bens - Imóvel 1
  possui_imovel1 BOOLEAN DEFAULT false,
  imovel1_tipo TEXT,
  imovel1_localizacao TEXT,
  imovel1_bairro TEXT,
  imovel1_cidade TEXT,
  imovel1_uf TEXT,
  imovel1_valor NUMERIC,

  -- Bens - Imóvel 2
  possui_imovel2 BOOLEAN DEFAULT false,
  imovel2_tipo TEXT,
  imovel2_localizacao TEXT,
  imovel2_bairro TEXT,
  imovel2_cidade TEXT,
  imovel2_uf TEXT,
  imovel2_valor NUMERIC,

  -- Bens - Veículo
  possui_veiculo BOOLEAN DEFAULT false,
  veiculo_valor NUMERIC,
  veiculo_ano TEXT,
  veiculo_placa TEXT,
  veiculo_estado TEXT,

  -- Bens - Empresa
  possui_empresa BOOLEAN DEFAULT false,
  empresa_nome TEXT,
  empresa_cnpj TEXT,

  -- Anexos (paths no Storage)
  anexo_documento TEXT,
  anexo_selfie TEXT,
  anexo_comprovante TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fichas_rating ENABLE ROW LEVEL SECURITY;

-- Anônimo pode inserir (formulário público)
CREATE POLICY "anon_insert_fichas_rating"
  ON public.fichas_rating FOR INSERT TO anon
  WITH CHECK (true);

-- Authenticated pode ler
CREATE POLICY "authenticated_select_fichas_rating"
  ON public.fichas_rating FOR SELECT TO authenticated
  USING (true);

-- Admin pode gerenciar tudo
CREATE POLICY "admin_all_fichas_rating"
  ON public.fichas_rating FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger de updated_at
CREATE TRIGGER update_fichas_rating_updated_at
  BEFORE UPDATE ON public.fichas_rating
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket para anexos das fichas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fichas-anexos',
  'fichas-anexos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Anônimo pode fazer upload
CREATE POLICY "anon_upload_fichas_anexos"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'fichas-anexos');

-- Authenticated pode baixar
CREATE POLICY "authenticated_read_fichas_anexos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'fichas-anexos');

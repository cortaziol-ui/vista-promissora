import { z } from 'zod';

const bancoSchema = z.object({
  banco: z.string().min(1, 'Obrigatório'),
  agencia: z.string().min(1, 'Obrigatório'),
  conta: z.string().min(1, 'Obrigatório'),
});

const referenciaSchema = z.object({
  nome: z.string().min(1, 'Obrigatório'),
  celular: z.string().min(1, 'Obrigatório'),
  grau: z.string().min(1, 'Obrigatório'),
});

export const fichaRatingSchema = z.object({
  // Dados Pessoais
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  cpf: z.string().min(11, 'CPF inválido'),
  rg: z.string().min(1, 'Obrigatório'),
  titulo_eleitor: z.string().min(1, 'Obrigatório'),
  data_expedicao: z.string().min(1, 'Obrigatório'),
  data_nascimento: z.string().min(1, 'Obrigatório'),
  estado_civil: z.string().min(1, 'Obrigatório'),
  nome_pai: z.string().min(1, 'Obrigatório'),
  nome_mae: z.string().min(1, 'Obrigatório'),

  // Endereço
  cep: z.string().min(1, 'Obrigatório'),
  endereco: z.string().min(1, 'Obrigatório'),
  numero: z.string().min(1, 'Obrigatório'),
  bairro: z.string().min(1, 'Obrigatório'),
  cidade: z.string().min(1, 'Obrigatório'),
  estado: z.string().min(1, 'Obrigatório'),

  // Contato
  tel_residencial: z.string().min(1, 'Obrigatório'),
  tel_celular: z.string().min(1, 'Obrigatório'),
  email: z.string().min(1, 'Obrigatório').email('Email inválido'),

  // Dados Profissionais
  empresa: z.string().min(1, 'Obrigatório'),
  data_admissao: z.string().min(1, 'Obrigatório'),
  salario: z.number({ required_error: 'Obrigatório' }).min(0, 'Obrigatório'),
  renda_familiar: z.number({ required_error: 'Obrigatório' }).min(0, 'Obrigatório'),
  faturamento: z.number({ required_error: 'Obrigatório' }).min(0, 'Obrigatório'),

  // Bancos
  bancos: z.array(bancoSchema).default([]),

  // Referências
  referencias: z.array(referenciaSchema).default([]),

  // Acesso Serasa
  login_serasa: z.string().min(1, 'Obrigatório'),
  senha_serasa: z.string().min(1, 'Obrigatório'),

  // Bens - Imóvel 1
  possui_imovel1: z.boolean().default(false),
  imovel1_tipo: z.string().optional(),
  imovel1_localizacao: z.string().optional(),
  imovel1_bairro: z.string().optional(),
  imovel1_cidade: z.string().optional(),
  imovel1_uf: z.string().optional(),
  imovel1_valor: z.number().optional(),

  // Bens - Imóvel 2
  possui_imovel2: z.boolean().default(false),
  imovel2_tipo: z.string().optional(),
  imovel2_localizacao: z.string().optional(),
  imovel2_bairro: z.string().optional(),
  imovel2_cidade: z.string().optional(),
  imovel2_uf: z.string().optional(),
  imovel2_valor: z.number().optional(),

  // Bens - Veículo
  possui_veiculo: z.boolean().default(false),
  veiculo_valor: z.number().optional(),
  veiculo_ano: z.string().optional(),
  veiculo_placa: z.string().optional(),
  veiculo_estado: z.string().optional(),

  // Bens - Empresa
  possui_empresa: z.boolean().default(false),
  empresa_nome: z.string().optional(),
  empresa_cnpj: z.string().optional(),
});

export type FichaRatingData = z.infer<typeof fichaRatingSchema>;

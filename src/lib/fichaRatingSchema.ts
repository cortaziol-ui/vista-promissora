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
  rg: z.string().optional(),
  titulo_eleitor: z.string().optional(),
  data_expedicao: z.string().optional(),
  data_nascimento: z.string().optional(),
  estado_civil: z.string().optional(),
  nome_pai: z.string().optional(),
  nome_mae: z.string().optional(),

  // Endereço
  cep: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),

  // Contato
  tel_residencial: z.string().optional(),
  tel_celular: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),

  // Dados Profissionais
  empresa: z.string().optional(),
  data_admissao: z.string().optional(),
  salario: z.number().optional(),
  renda_familiar: z.number().optional(),
  faturamento: z.number().optional(),

  // Bancos
  bancos: z.array(bancoSchema).default([]),

  // Referências
  referencias: z.array(referenciaSchema).default([]),

  // Acesso Serasa
  login_serasa: z.string().optional(),
  senha_serasa: z.string().optional(),

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

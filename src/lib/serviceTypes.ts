import type { Cliente } from '@/contexts/SalesDataContext';

export type ServiceType = 'GERAL' | 'LIMPA_NOME' | 'RATING';

export const SERVICE_TYPE_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: 'GERAL', label: 'Geral' },
  { value: 'LIMPA_NOME', label: 'Limpa Nome' },
  { value: 'RATING', label: 'Rating' },
];

export const SERVICE_FILTER_STORAGE_KEY = 'salesServiceFilter';

export function serviceTypeLabel(t: ServiceType): string {
  return SERVICE_TYPE_OPTIONS.find(o => o.value === t)?.label ?? 'Geral';
}

/**
 * Conta quantas vendas um cliente representa dentro de um recorte de servico.
 *
 * Regra do dono: venda marcada como "LIMPA NOME + RATING" vale 2 vendas em
 * QUALQUER tela, inclusive nos recortes de Limpa Nome e de Rating. Era assim
 * antes do filtro de servico existir e e assim que a Outcom conta comissao.
 *
 * - GERAL:      combo = 2, qualquer outro = 1
 * - LIMPA_NOME: combo = 2, LIMPA NOME = 1, demais = 0
 * - RATING:     combo = 2, RATING = 1, demais = 0
 *
 * A comparacao normaliza caixa e espacos porque `clientes.servico` e TEXT livre,
 * sem CHECK constraint: qualquer variacao gravada faria a venda contar errado.
 */
function normalizeServico(servico: string | null | undefined): string {
  return (servico ?? '').toUpperCase().replace(/\s+/g, ' ').trim();
}

const COMBO = 'LIMPA NOME + RATING';

export function salesCount(c: Pick<Cliente, 'servico'>, serviceType: ServiceType = 'GERAL'): number {
  const servico = normalizeServico(c.servico);
  const isCombo = servico === COMBO;

  if (serviceType === 'GERAL') {
    return isCombo ? 2 : 1;
  }
  if (serviceType === 'LIMPA_NOME') {
    if (isCombo) return 2;
    return servico === 'LIMPA NOME' ? 1 : 0;
  }
  if (serviceType === 'RATING') {
    if (isCombo) return 2;
    return servico === 'RATING' ? 1 : 0;
  }
  return 0;
}

export function isClienteInService(c: Pick<Cliente, 'servico'>, serviceType: ServiceType): boolean {
  return salesCount(c, serviceType) > 0;
}

export function monthlyGoalsKey(serviceType: ServiceType): string {
  switch (serviceType) {
    case 'LIMPA_NOME': return 'meta_empresa_vendas_limpa_nome';
    case 'RATING':     return 'meta_empresa_vendas_rating';
    default:           return 'meta_empresa_vendas';
  }
}

/**
 * Detecta a qual serviço uma campanha pertence pelo nome.
 * Heurística: procura "RATING" primeiro (mais específico) e "LIMPA NOME"/"LIMPA-NOME"/"LN" depois.
 * Retorna null quando não conseguiu classificar — caller decide se considera GERAL ou ignora.
 */
export function detectCampaignService(name: string): 'LIMPA_NOME' | 'RATING' | null {
  const upper = name.toUpperCase();
  if (upper.includes('RATING')) return 'RATING';
  if (upper.includes('LIMPA NOME') || upper.includes('LIMPA-NOME') || upper.includes('LIMPANOME')) return 'LIMPA_NOME';
  // Fallback: "LN" como token isolado (evita falso-positivo em "LANCAMENTO" etc)
  if (/\bLN\b/.test(upper)) return 'LIMPA_NOME';
  if (/\bRT\b/.test(upper)) return 'RATING';
  return null;
}

/**
 * Verifica se uma campanha (pelo nome) entra no recorte do filtro de serviço.
 * - GERAL: tudo entra
 * - LIMPA_NOME: só campanhas detectadas como LIMPA_NOME
 * - RATING: só campanhas detectadas como RATING
 * Campanhas não classificadas ficam de fora dos recortes específicos (mas entram em GERAL).
 */
export function isCampaignInService(name: string, serviceType: ServiceType): boolean {
  if (serviceType === 'GERAL') return true;
  return detectCampaignService(name) === serviceType;
}

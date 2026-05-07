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
 * - GERAL: combo (LIMPA NOME + RATING) = 2, qualquer outro = 1.
 * - LIMPA_NOME: LIMPA NOME ou combo = 1, demais = 0.
 * - RATING: RATING ou combo = 1, demais = 0.
 */
export function salesCount(c: Pick<Cliente, 'servico'>, serviceType: ServiceType = 'GERAL'): number {
  if (serviceType === 'GERAL') {
    return c.servico === 'LIMPA NOME + RATING' ? 2 : 1;
  }
  if (serviceType === 'LIMPA_NOME') {
    return c.servico === 'LIMPA NOME' || c.servico === 'LIMPA NOME + RATING' ? 1 : 0;
  }
  if (serviceType === 'RATING') {
    return c.servico === 'RATING' || c.servico === 'LIMPA NOME + RATING' ? 1 : 0;
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

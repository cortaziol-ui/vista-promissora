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

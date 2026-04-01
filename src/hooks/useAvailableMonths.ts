import { useMemo } from 'react';
import { getCurrentMonth } from '@/lib/dateUtils';
import type { Cliente } from '@/contexts/SalesDataContext';

export function useAvailableMonths(clientes: Cliente[]): string[] {
  return useMemo(() => {
    const set = new Set<string>();
    set.add(getCurrentMonth());
    clientes.forEach(c => {
      const parts = (c.data || '').split('/');
      if (parts.length === 3) {
        const [, mm, yyyy] = parts;
        if (yyyy && mm) set.add(`${yyyy}-${mm.padStart(2, '0')}`);
      }
    });
    return Array.from(set).sort().reverse();
  }, [clientes]);
}

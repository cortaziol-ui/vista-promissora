import type { Vendedor } from '@/contexts/SalesDataContext';

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function isVendorActiveToday(v: Pick<Vendedor, 'inactiveFrom'>): boolean {
  if (!v.inactiveFrom) return true;
  return v.inactiveFrom > todayIso();
}

export function isVendorActiveInMonth(
  v: Pick<Vendedor, 'inactiveFrom'>,
  monthYYYYMM: string,
): boolean {
  if (!v.inactiveFrom) return true;
  const firstDayOfMonth = `${monthYYYYMM}-01`;
  return v.inactiveFrom > firstDayOfMonth;
}

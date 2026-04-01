/** Parse "DD/MM/YYYY" into "YYYY-MM" */
export function parseMonthFromData(data: string): string | null {
  if (!data) return null;
  const parts = data.split('/');
  if (parts.length !== 3) return null;
  const [, mm, yyyy] = parts;
  if (!yyyy || !mm) return null;
  return `${yyyy}-${mm.padStart(2, '0')}`;
}

/** Count weekdays (Mon-Fri) from fromDay to toDay (inclusive) in a given year/month (1-indexed month) */
export function countWeekdays(year: number, month: number, fromDay: number, toDay: number): number {
  let count = 0;
  for (let d = fromDay; d <= toDay; d++) {
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
  }
  return count;
}

/** Get current month as "YYYY-MM" */
export function getCurrentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Format "YYYY-MM" into a human label like "Abr/2026" */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[Number(m) - 1]}/${y}`;
}

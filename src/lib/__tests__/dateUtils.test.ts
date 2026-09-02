import { describe, it, expect } from 'vitest';
import { parseMonthFromData, countWeekdays, getCurrentMonth, monthLabel, monthFromTimestamp } from '../dateUtils';

describe('parseMonthFromData', () => {
  it('parses DD/MM/YYYY into YYYY-MM', () => {
    expect(parseMonthFromData('15/04/2026')).toBe('2026-04');
    expect(parseMonthFromData('01/01/2025')).toBe('2025-01');
    expect(parseMonthFromData('31/12/2024')).toBe('2024-12');
  });

  it('pads single-digit months', () => {
    expect(parseMonthFromData('05/3/2026')).toBe('2026-03');
  });

  it('returns null for empty or invalid input', () => {
    expect(parseMonthFromData('')).toBeNull();
    expect(parseMonthFromData('invalid')).toBeNull();
    expect(parseMonthFromData('15-04-2026')).toBeNull();
    expect(parseMonthFromData('15/04')).toBeNull();
  });
});

describe('countWeekdays', () => {
  it('counts weekdays correctly for a full week', () => {
    // 2026-04-06 is Monday, 2026-04-12 is Sunday
    expect(countWeekdays(2026, 4, 6, 10)).toBe(5); // Mon-Fri
  });

  it('excludes weekends', () => {
    // 2026-04-11 is Saturday, 2026-04-12 is Sunday
    expect(countWeekdays(2026, 4, 11, 12)).toBe(0);
  });

  it('counts single weekday', () => {
    // 2026-04-06 is Monday
    expect(countWeekdays(2026, 4, 6, 6)).toBe(1);
  });

  it('returns 0 for empty range', () => {
    expect(countWeekdays(2026, 4, 5, 4)).toBe(0);
  });
});

describe('getCurrentMonth', () => {
  it('returns YYYY-MM format', () => {
    const result = getCurrentMonth();
    expect(result).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe('monthLabel', () => {
  it('formats YYYY-MM into human label', () => {
    expect(monthLabel('2026-01')).toBe('Jan/2026');
    expect(monthLabel('2026-04')).toBe('Abr/2026');
    expect(monthLabel('2026-12')).toBe('Dez/2026');
  });

  it('handles all 12 months', () => {
    const expected = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    expected.forEach((label, i) => {
      const month = String(i + 1).padStart(2, '0');
      expect(monthLabel(`2026-${month}`)).toBe(`${label}/2026`);
    });
  });
});

describe('monthFromTimestamp', () => {
  it('extrai YYYY-MM de um timestamp ISO', () => {
    // construido em horario LOCAL: 15/04/2026 12:00
    const iso = new Date(2026, 3, 15, 12, 0).toISOString();
    expect(monthFromTimestamp(iso)).toBe('2026-04');
  });

  it('usa o fuso local, nao o UTC cru', () => {
    // 31/07 as 22h no fuso do usuario ainda e julho pra ele, mesmo que em UTC
    // ja seja 01/08. A coluna "Data" da tela usa toLocaleDateString, entao o
    // agrupamento por mes precisa concordar com o que ele le na tela.
    const iso = new Date(2026, 6, 31, 22, 0).toISOString();
    expect(monthFromTimestamp(iso)).toBe('2026-07');
  });

  it('acerta o primeiro instante do mes', () => {
    const iso = new Date(2026, 0, 1, 0, 0).toISOString();
    expect(monthFromTimestamp(iso)).toBe('2026-01');
  });

  it('padroniza o mes com dois digitos', () => {
    const iso = new Date(2026, 8, 9, 10, 0).toISOString();
    expect(monthFromTimestamp(iso)).toBe('2026-09');
  });

  it('devolve null pra entrada vazia ou invalida', () => {
    expect(monthFromTimestamp('')).toBeNull();
    expect(monthFromTimestamp('nao e data')).toBeNull();
    expect(monthFromTimestamp(null as any)).toBeNull();
    expect(monthFromTimestamp(undefined as any)).toBeNull();
  });
});

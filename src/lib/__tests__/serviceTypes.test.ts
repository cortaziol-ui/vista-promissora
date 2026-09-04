import { describe, it, expect } from 'vitest';
import { salesCount, isClienteInService } from '../serviceTypes';

const c = (servico: string) => ({ servico }) as any;

describe('salesCount', () => {
  it('conta o combo como 2 vendas no recorte Geral', () => {
    expect(salesCount(c('LIMPA NOME + RATING'), 'GERAL')).toBe(2);
  });

  it('conta o combo como 2 vendas TAMBEM nos recortes especificos', () => {
    // Regra do dono: marcou "Limpa Nome + Rating", vale 2 vendas, em qualquer tela.
    expect(salesCount(c('LIMPA NOME + RATING'), 'LIMPA_NOME')).toBe(2);
    expect(salesCount(c('LIMPA NOME + RATING'), 'RATING')).toBe(2);
  });

  it('conta servico simples como 1 no seu proprio recorte', () => {
    expect(salesCount(c('LIMPA NOME'), 'GERAL')).toBe(1);
    expect(salesCount(c('LIMPA NOME'), 'LIMPA_NOME')).toBe(1);
    expect(salesCount(c('RATING'), 'RATING')).toBe(1);
    expect(salesCount(c('OUTROS'), 'GERAL')).toBe(1);
  });

  it('zera servico que nao pertence ao recorte', () => {
    expect(salesCount(c('RATING'), 'LIMPA_NOME')).toBe(0);
    expect(salesCount(c('LIMPA NOME'), 'RATING')).toBe(0);
    expect(salesCount(c('OUTROS'), 'LIMPA_NOME')).toBe(0);
    expect(salesCount(c('OUTROS'), 'RATING')).toBe(0);
  });

  it('nao deixa variacao de caixa ou espaco quebrar a contagem do combo', () => {
    // A coluna servico e TEXT livre, sem CHECK constraint: da pra gravar qualquer coisa.
    expect(salesCount(c('limpa nome + rating'), 'GERAL')).toBe(2);
    expect(salesCount(c('  LIMPA NOME + RATING  '), 'GERAL')).toBe(2);
    expect(salesCount(c('LIMPA NOME  +  RATING'), 'GERAL')).toBe(2);
    expect(salesCount(c('LIMPA NOME + RATING'), 'RATING')).toBe(2);
    expect(salesCount(c('limpa nome'), 'LIMPA_NOME')).toBe(1);
  });

  it('isClienteInService acompanha a contagem', () => {
    expect(isClienteInService(c('LIMPA NOME + RATING'), 'LIMPA_NOME')).toBe(true);
    expect(isClienteInService(c('LIMPA NOME + RATING'), 'RATING')).toBe(true);
    expect(isClienteInService(c('RATING'), 'LIMPA_NOME')).toBe(false);
  });
});

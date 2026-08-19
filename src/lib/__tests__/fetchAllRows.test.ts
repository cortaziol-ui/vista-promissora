import { describe, it, expect, vi } from 'vitest';
import { fetchAllRows } from '../fetchAllRows';

/** Builds a fake PostgREST-style query that slices a source array by range. */
function makeSource<T>(rows: T[], pageCap: number) {
  const calls: Array<[number, number]> = [];
  const query = (from: number, to: number) => {
    calls.push([from, to]);
    // PostgREST never returns more than the server cap, even if the range is wider
    const end = Math.min(to + 1, from + pageCap);
    return Promise.resolve({ data: rows.slice(from, end), error: null });
  };
  return { query, calls };
}

describe('fetchAllRows', () => {
  it('retorna todas as linhas quando o total passa do tamanho da pagina', async () => {
    const rows = Array.from({ length: 2350 }, (_, i) => ({ id: i + 1 }));
    const { query } = makeSource(rows, 1000);

    const result = await fetchAllRows(query, 1000);

    expect(result).toHaveLength(2350);
    expect(result[0]).toEqual({ id: 1 });
    expect(result[2349]).toEqual({ id: 2350 });
  });

  it('pede as faixas certas, sem pular nem repetir linha', async () => {
    const rows = Array.from({ length: 2350 }, (_, i) => ({ id: i + 1 }));
    const { query, calls } = makeSource(rows, 1000);

    await fetchAllRows(query, 1000);

    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it('para na primeira pagina quando o total cabe nela', async () => {
    const rows = Array.from({ length: 42 }, (_, i) => ({ id: i + 1 }));
    const { query, calls } = makeSource(rows, 1000);

    const result = await fetchAllRows(query, 1000);

    expect(result).toHaveLength(42);
    expect(calls).toHaveLength(1);
  });

  it('lida com total exatamente igual ao tamanho da pagina sem duplicar', async () => {
    const rows = Array.from({ length: 1000 }, (_, i) => ({ id: i + 1 }));
    const { query, calls } = makeSource(rows, 1000);

    const result = await fetchAllRows(query, 1000);

    expect(result).toHaveLength(1000);
    // precisa de uma segunda chamada pra descobrir que acabou, e ela volta vazia
    expect(calls).toEqual([[0, 999], [1000, 1999]]);
  });

  it('retorna vazio quando nao ha linhas', async () => {
    const { query } = makeSource([], 1000);
    expect(await fetchAllRows(query, 1000)).toEqual([]);
  });

  it('trata data null como fim da paginacao', async () => {
    const query = vi.fn().mockResolvedValue({ data: null, error: null });
    expect(await fetchAllRows(query, 1000)).toEqual([]);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('propaga erro do PostgREST em vez de devolver lista parcial', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ data: Array.from({ length: 1000 }, (_, i) => ({ id: i })), error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'boom' } });

    await expect(fetchAllRows(query, 1000)).rejects.toThrow('boom');
  });

  it('respeita um tamanho de pagina customizado', async () => {
    const rows = Array.from({ length: 250 }, (_, i) => ({ id: i + 1 }));
    const { query, calls } = makeSource(rows, 100);

    const result = await fetchAllRows(query, 100);

    expect(result).toHaveLength(250);
    expect(calls).toEqual([[0, 99], [100, 199], [200, 299]]);
  });

  it('nao entra em loop infinito se o servidor ignorar a faixa', async () => {
    // servidor teimoso: devolve sempre a mesma pagina cheia
    const query = vi.fn().mockResolvedValue({
      data: Array.from({ length: 1000 }, (_, i) => ({ id: i })),
      error: null,
    });

    await expect(fetchAllRows(query, 1000, 5)).rejects.toThrow(/pagina/i);
    expect(query).toHaveBeenCalledTimes(5);
  });
});

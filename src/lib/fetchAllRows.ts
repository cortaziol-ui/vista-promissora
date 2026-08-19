/**
 * Busca paginada para tabelas que podem passar do teto de linhas do PostgREST.
 *
 * O PostgREST corta toda resposta em `db-max-rows` (1000 por padrao no Supabase)
 * e nao avisa quando corta. Um `.select('*')` sem `.range()` numa tabela grande
 * devolve so as primeiras 1000 linhas em silencio, e como as queries daqui usam
 * `.order('id')` crescente, o que some e sempre o dado mais novo.
 *
 * Foi assim que as vendas a partir de 14/08/2026 sumiram da planilha: a linha
 * 1000 de clientes caiu em 13/08 e tudo depois disso parou de chegar no front,
 * mesmo estando gravado no banco.
 *
 * Uso:
 *   const rows = await fetchAllRows((from, to) =>
 *     supabase.from('clientes').select('*').eq('account_id', id).order('id').range(from, to)
 *   );
 */

export type RangedQuery<T> = (
  from: number,
  to: number,
) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

export const DEFAULT_PAGE_SIZE = 1000;

export async function fetchAllRows<T>(
  query: RangedQuery<T>,
  pageSize: number = DEFAULT_PAGE_SIZE,
  maxPages: number = 100,
): Promise<T[]> {
  const all: T[] = [];

  for (let page = 0; page < maxPages; page++) {
    const from = page * pageSize;
    const { data, error } = await query(from, from + pageSize - 1);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return all;

    all.push(...data);

    // Pagina incompleta significa que o servidor chegou no fim do conjunto.
    if (data.length < pageSize) return all;
  }

  // Se chegou aqui, o servidor devolveu pagina cheia `maxPages` vezes seguidas.
  // Ou a tabela e absurdamente maior que o esperado, ou a faixa esta sendo
  // ignorada. Estourar e melhor que devolver dado pela metade em silencio,
  // que e exatamente o bug que esta funcao existe pra evitar.
  throw new Error(
    `fetchAllRows: passou de ${maxPages} paginas de ${pageSize} linhas sem terminar. ` +
      `Verifique se a query aplica o .range() recebido.`,
  );
}

/**
 * Extrai a quantidade de unidades de um prêmio a partir do label.
 * "Pack 6 Monster" -> 6, "2 Marmitas" -> 2, "1 Pack Monster + Lanche" -> 1
 * Ignora números que sejam valor em reais ("Pix de R$ 50" -> 1, não 50).
 * Default: 1 (entrega única).
 */
export function parsePrizeQuantity(label: string): number {
  if (!label) return 1;

  // Remove trechos "R$ XX" ou "R$XX" para que o valor monetário não seja confundido com quantidade.
  const cleaned = label.replace(/R\$\s*\d+/gi, '');

  const match = cleaned.match(/\b(\d{1,3})\b/);
  if (!match) return 1;

  const n = parseInt(match[1], 10);
  if (Number.isNaN(n) || n < 1) return 1;
  // Limite de sanidade — pacotes na prática não passam de 24 unidades.
  return Math.min(n, 99);
}

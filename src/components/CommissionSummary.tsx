import { Trophy, CheckCircle2, Lock, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCommissionTiers } from '@/hooks/useCommissionTiers';

interface CommissionSummaryProps {
  vendedorNome: string;
  vendedorId?: number | null;
  vendas: number;
  meta: number;
  month: string;
}

export function CommissionSummary({
  vendedorNome,
  vendedorId = null,
  vendas,
  meta,
  month,
}: CommissionSummaryProps) {
  const { tiers, currentTier, totalPremiacao, nextTier, vendasParaProxima, loading } =
    useCommissionTiers({ vendedorId, month, vendas, meta });

  if (loading) {
    return (
      <div className="glass-card p-4 animate-pulse space-y-3">
        <div className="h-4 w-32 rounded bg-secondary" />
        <div className="h-8 w-24 rounded bg-secondary" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-secondary" />
          <div className="h-3 w-full rounded bg-secondary" />
        </div>
      </div>
    );
  }

  if (tiers.length === 0) {
    return (
      <div className="glass-card p-4">
        <p className="text-sm text-muted-foreground">
          Sem faixas de comissao configuradas para este periodo.
        </p>
      </div>
    );
  }

  const unlockedTiers = tiers.filter((t) => t.unlocked);
  const lockedTiers = tiers.filter((t) => !t.unlocked);

  return (
    <div className="glass-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-kpi-sales/15">
            <Trophy className="w-4 h-4 text-kpi-sales" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {vendedorNome}
            </p>
            <p className="text-xs text-muted-foreground">
              {vendas}/{meta} vendas
            </p>
          </div>
        </div>

        {currentTier && (
          <Badge className="bg-kpi-success/15 text-kpi-success border-kpi-success/30 shrink-0">
            {currentTier.faixa_nome}
          </Badge>
        )}
      </div>

      {/* Total premiacao */}
      <div className="bg-secondary/50 rounded-lg p-3">
        <p className="text-xs text-muted-foreground mb-0.5">
          Premiacao acumulada
        </p>
        <p className="text-2xl font-bold text-foreground tracking-tight">
          R$ {totalPremiacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      </div>

      {/* Next tier highlight */}
      {nextTier && vendasParaProxima !== null && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-kpi-sales/30 bg-kpi-sales/5">
          <ArrowRight className="w-3.5 h-3.5 text-kpi-sales shrink-0" />
          <p className="text-xs text-foreground">
            <span className="font-semibold text-kpi-sales">
              {vendasParaProxima} {vendasParaProxima === 1 ? 'venda' : 'vendas'}
            </span>
            {' '}para{' '}
            <span className="font-medium">{nextTier.faixa_nome}</span>
            {' '}(+R${nextTier.premiacao})
          </p>
        </div>
      )}

      {/* Tier list */}
      <div className="space-y-1.5">
        {unlockedTiers.map((tier) => (
          <div
            key={tier.id}
            className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-kpi-success/5"
          >
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-kpi-success shrink-0" />
              <span className="text-xs text-foreground truncate">
                {tier.faixa_nome}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {tier.pct_meta}%
              </span>
            </div>
            <span className="text-xs font-semibold text-kpi-success whitespace-nowrap">
              +R${tier.premiacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        ))}

        {lockedTiers.map((tier) => {
          const falta = tier.vendasNecessarias - vendas;
          return (
            <div
              key={tier.id}
              className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Lock className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                <span className="text-xs text-muted-foreground truncate">
                  {tier.faixa_nome}
                </span>
                <span className="text-[10px] text-muted-foreground/60 shrink-0">
                  {tier.pct_meta}%
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                Falta {falta} {falta === 1 ? 'venda' : 'vendas'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

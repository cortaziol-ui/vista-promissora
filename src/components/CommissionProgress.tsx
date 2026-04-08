import { Check, Lock } from 'lucide-react';
import { useCommissionTiers } from '@/hooks/useCommissionTiers';

interface CommissionProgressProps {
  vendedorNome: string;
  vendedorId?: number | null;
  vendas: number;
  meta: number;
  month: string;
  size?: 'default' | 'large';
}

export function CommissionProgress({
  vendedorNome,
  vendedorId = null,
  vendas,
  meta,
  month,
  size = 'default',
}: CommissionProgressProps) {
  const isLarge = size === 'large';
  const { tiers, currentTier, loading } = useCommissionTiers({
    vendedorId,
    month,
    vendas,
    meta,
  });

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <div className="h-2 w-full rounded-full bg-secondary animate-pulse" />
      </div>
    );
  }

  if (tiers.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-1">
        Sem faixas configuradas
      </p>
    );
  }

  const minPct = Math.min(...tiers.map((t) => t.pct_meta));
  const maxPct = Math.max(...tiers.map((t) => t.pct_meta));
  const range = maxPct - minPct;
  const currentPct = meta > 0 ? (vendas / meta) * 100 : 0;

  // Map a pct_meta value to position on the bar (0% to 100%)
  const toPos = (pct: number) => {
    if (range === 0) return 50;
    return Math.max(0, Math.min(100, ((pct - minPct) / range) * 100));
  };

  const barProgress = Math.max(0, Math.min(100, toPos(currentPct)));

  return (
    <div className="w-full px-6">
      {/* Progress track */}
      <div className={`relative w-full ${isLarge ? 'h-10' : 'h-8'} flex items-center`}>
        {/* Background track */}
        <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 ${isLarge ? 'h-3' : 'h-2'} rounded-full bg-secondary`} />

        {/* Filled track */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 left-0 ${isLarge ? 'h-3' : 'h-2'} rounded-full bg-gradient-to-r from-kpi-sales to-kpi-success progress-animate`}
          style={{ width: `${barProgress}%` }}
        />

        {/* Current position indicator */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 ${isLarge ? 'w-3 h-6' : 'w-2.5 h-5'} rounded-sm bg-foreground/90 shadow-lg z-20 transition-all duration-500`}
          style={{ left: `calc(${barProgress}% - 5px)` }}
        />

        {/* Checkpoint dots */}
        {tiers.map((tier) => {
          const left = toPos(tier.pct_meta);
          const isUnlocked = tier.unlocked;
          const isCurrent = currentTier?.id === tier.id;

          return (
            <div
              key={tier.id}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
              style={{ left: `${left}%` }}
            >
              <div
                className={`
                  ${isLarge ? 'w-9 h-9' : 'w-7 h-7'} rounded-full flex items-center justify-center
                  transition-all duration-300 border-2
                  ${isUnlocked
                    ? 'bg-kpi-success text-white border-kpi-success shadow-[0_0_10px_hsl(var(--kpi-success)/0.5)]'
                    : 'bg-secondary text-muted-foreground border-border'
                  }
                  ${isCurrent ? 'ring-2 ring-kpi-success/40 ring-offset-2 ring-offset-background scale-110' : ''}
                `}
              >
                {isUnlocked ? (
                  <Check className={isLarge ? 'w-4.5 h-4.5' : 'w-3.5 h-3.5'} />
                ) : (
                  <Lock className={isLarge ? 'w-4 h-4' : 'w-3 h-3'} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tier labels */}
      <div className="relative w-full mt-1" style={{ height: isLarge ? '4.5rem' : '3.2rem' }}>
        {tiers.map((tier) => {
          const left = toPos(tier.pct_meta);
          return (
            <div
              key={tier.id}
              className="absolute -translate-x-1/2 text-center"
              style={{ left: `${left}%` }}
            >
              <p
                className={`${isLarge ? 'text-sm' : 'text-[11px]'} font-semibold leading-tight ${
                  tier.unlocked ? 'text-kpi-success' : 'text-muted-foreground'
                }`}
              >
                {tier.pct_meta}%
              </p>
              <p
                className={`${isLarge ? 'text-xs' : 'text-[10px]'} leading-tight ${
                  tier.unlocked ? 'text-kpi-success/70' : 'text-muted-foreground/50'
                }`}
              >
                {tier.vendasNecessarias} vendas
              </p>
              <p
                className={`${isLarge ? 'text-xs font-medium' : 'text-[10px]'} leading-tight ${
                  tier.unlocked ? 'text-foreground/80' : 'text-muted-foreground/60'
                }`}
              >
                R${tier.premiacao}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

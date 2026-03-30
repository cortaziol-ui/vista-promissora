import { Check, Lock, Trophy } from 'lucide-react';
import { useCommissionTiers } from '@/hooks/useCommissionTiers';

interface CommissionProgressProps {
  vendedorNome: string;
  vendedorId?: number | null;
  vendas: number;
  meta: number;
  month: string;
}

export function CommissionProgress({
  vendedorNome,
  vendedorId = null,
  vendas,
  meta,
  month,
}: CommissionProgressProps) {
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

  const maxPct = Math.max(...tiers.map((t) => t.pct_meta));
  const currentPct = meta > 0 ? (vendas / meta) * 100 : 0;
  const barProgress = Math.min((currentPct / maxPct) * 100, 100);

  return (
    <div className="w-full min-w-[240px]">
      {/* Progress track */}
      <div className="relative w-full h-6 flex items-center">
        {/* Background track */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-secondary" />

        {/* Filled track */}
        <div
          className="absolute top-1/2 -translate-y-1/2 left-0 h-1.5 rounded-full bg-gradient-to-r from-kpi-sales to-kpi-success progress-animate"
          style={{ width: `${barProgress}%` }}
        />

        {/* Current position indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-4 rounded-sm bg-foreground/90 shadow-lg z-20 transition-all duration-500"
          style={{ left: `calc(${barProgress}% - 4px)` }}
        />

        {/* Checkpoint dots */}
        {tiers.map((tier) => {
          const left = (tier.pct_meta / maxPct) * 100;
          const isUnlocked = tier.unlocked;
          const isCurrent = currentTier?.id === tier.id;

          return (
            <div
              key={tier.id}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 transition-all duration-300"
              style={{ left: `${left}%` }}
            >
              <div
                className={`
                  w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold
                  transition-all duration-300 border-2
                  ${isUnlocked
                    ? 'bg-kpi-success text-white border-kpi-success shadow-[0_0_8px_hsl(var(--kpi-success)/0.5)]'
                    : 'bg-secondary text-muted-foreground border-border'
                  }
                  ${isCurrent ? 'ring-2 ring-kpi-success/40 ring-offset-1 ring-offset-background scale-110' : ''}
                `}
              >
                {isUnlocked ? (
                  <Check className="w-2.5 h-2.5" />
                ) : (
                  <Lock className="w-2.5 h-2.5" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tier labels */}
      <div className="relative w-full mt-0.5" style={{ height: '2rem' }}>
        {tiers.map((tier) => {
          const left = (tier.pct_meta / maxPct) * 100;
          return (
            <div
              key={tier.id}
              className="absolute -translate-x-1/2 text-center"
              style={{ left: `${left}%` }}
            >
              <p
                className={`text-[9px] font-medium leading-tight truncate max-w-[60px] ${
                  tier.unlocked ? 'text-kpi-success' : 'text-muted-foreground'
                }`}
              >
                {tier.pct_meta}%
              </p>
              <p
                className={`text-[8px] leading-tight ${
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

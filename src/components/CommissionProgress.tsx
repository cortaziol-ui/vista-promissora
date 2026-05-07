import { Check, Lock } from 'lucide-react';
import { useCommissionTiers } from '@/hooks/useCommissionTiers';
import { type ServiceType } from '@/lib/serviceTypes';

interface CommissionProgressProps {
  vendedorNome: string;
  vendedorId?: number | null;
  vendas: number;
  meta: number;
  month: string;
  size?: 'default' | 'large';
  serviceType?: ServiceType;
}

export function CommissionProgress({
  vendedorNome,
  vendedorId = null,
  vendas,
  meta,
  month,
  size = 'default',
  serviceType = 'GERAL',
}: CommissionProgressProps) {
  const isLarge = size === 'large';
  const { tiers, currentTier, loading } = useCommissionTiers({
    vendedorId,
    month,
    vendas,
    meta,
    serviceType,
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

  const currentPct = meta > 0 ? (vendas / meta) * 100 : 0;

  // Posicao uniforme: cada tier ocupa 1/(n-1) da barra, independente do pct_meta.
  // Isso evita gap visual quando tiers nao sao equidistantes (ex: 70 -> 100 -> 110 -> 120 ...).
  // Indices sao calculados pela ordem do array (ja vem ordenado por sort_order do hook).
  const lastIdx = Math.max(1, tiers.length - 1);
  const tierPosByPct = new Map(tiers.map((t, i) => [t.pct_meta, (i / lastIdx) * 100]));

  const toPos = (pct: number) => {
    if (tiers.length === 0) return 50;
    if (tiers.length === 1) return 50;
    // Se cair exatamente num tier, usa a posicao calculada.
    const exact = tierPosByPct.get(pct);
    if (exact !== undefined) return exact;
    // Caso contrario, interpola linearmente entre os dois tiers vizinhos.
    if (pct <= tiers[0].pct_meta) return 0;
    if (pct >= tiers[tiers.length - 1].pct_meta) return 100;
    for (let i = 0; i < tiers.length - 1; i++) {
      const a = tiers[i];
      const b = tiers[i + 1];
      if (pct >= a.pct_meta && pct <= b.pct_meta) {
        const segLen = b.pct_meta - a.pct_meta;
        const localT = segLen === 0 ? 0 : (pct - a.pct_meta) / segLen;
        const aPos = (i / lastIdx) * 100;
        const bPos = ((i + 1) / lastIdx) * 100;
        return aPos + (bPos - aPos) * localT;
      }
    }
    return 100;
  };

  const barProgress = Math.max(0, Math.min(100, toPos(currentPct)));

  // Quando tem muitos tiers (>10) os dots/labels apertam — encolhe pra evitar sobreposicao.
  const isDense = tiers.length > 10;
  const dotSize = isLarge
    ? (isDense ? 'w-7 h-7' : 'w-9 h-9')
    : (isDense ? 'w-5 h-5' : 'w-7 h-7');
  const checkSize = isLarge
    ? (isDense ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5')
    : (isDense ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5');
  const lockSize = isLarge
    ? (isDense ? 'w-3 h-3' : 'w-4 h-4')
    : (isDense ? 'w-2.5 h-2.5' : 'w-3 h-3');
  const labelMaxWidth = isDense ? '52px' : 'auto';

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
                  ${dotSize} rounded-full flex items-center justify-center
                  transition-all duration-300 border-2
                  ${isUnlocked
                    ? 'bg-kpi-success text-white border-kpi-success shadow-[0_0_10px_hsl(var(--kpi-success)/0.5)]'
                    : 'bg-secondary text-muted-foreground border-border'
                  }
                  ${isCurrent ? 'ring-2 ring-kpi-success/40 ring-offset-2 ring-offset-background scale-110' : ''}
                `}
              >
                {isUnlocked ? (
                  <Check className={checkSize} />
                ) : (
                  <Lock className={lockSize} />
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
              style={{ left: `${left}%`, maxWidth: labelMaxWidth }}
            >
              <p
                className={`${isLarge ? 'text-sm' : 'text-[11px]'} font-semibold leading-tight ${
                  tier.unlocked ? 'text-kpi-success' : 'text-foreground'
                }`}
              >
                {tier.pct_meta}%
              </p>
              <p
                className={`${isLarge ? 'text-xs' : 'text-[10px]'} leading-tight ${
                  tier.unlocked ? 'text-kpi-success/80' : 'text-foreground/70'
                }`}
              >
                {tier.vendasNecessarias} vendas
              </p>
              <p
                className={`${isLarge ? 'text-xs font-medium' : 'text-[10px]'} font-medium leading-tight ${
                  tier.unlocked ? 'text-foreground' : 'text-foreground/85'
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

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({ value, max = 100, className = '', showLabel = true }: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct < 50 ? 'bg-kpi-error' : pct < 80 ? 'bg-kpi-warning' : 'bg-kpi-success';

  return (
    <div className={`w-full ${className}`}>
      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full progress-animate ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-muted-foreground mt-1">{pct.toFixed(1)}%</p>
      )}
    </div>
  );
}

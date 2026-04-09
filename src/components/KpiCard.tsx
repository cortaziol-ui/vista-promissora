import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string;
  change?: number;
  icon: ReactNode;
  glowClass: string;
  colorClass: string;
  subtitle?: string;
  delay?: number;
  size?: 'default' | 'large' | 'compact';
}

export function KpiCard({ title, value, change, icon, glowClass, colorClass, subtitle, delay = 0, size = 'default' }: KpiCardProps) {
  const isLarge = size === 'large';
  const isCompact = size === 'compact';

  if (isCompact) {
    return (
      <div
        className={`glass-card px-2.5 py-1.5 hover-lift ${glowClass} animate-in`}
        style={{ animationDelay: `${delay}ms` }}
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className={`w-6 h-6 rounded-md flex items-center justify-center ${colorClass} bg-opacity-15 shrink-0`}>
            {icon}
          </div>
          <p className="text-[10px] text-muted-foreground truncate leading-tight">{title}</p>
        </div>
        <p className="text-base font-bold text-foreground tracking-tight leading-none">{value}</p>
        {subtitle && <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{subtitle}</p>}
      </div>
    );
  }

  return (
    <div
      className={`glass-card ${isLarge ? 'p-5' : 'p-5'} hover-lift ${glowClass} animate-in`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`flex items-start justify-between ${isLarge ? 'mb-5' : 'mb-3'}`}>
        <div className={`${isLarge ? 'w-16 h-16' : 'w-10 h-10'} rounded-lg flex items-center justify-center ${colorClass} bg-opacity-15`}>
          {icon}
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 ${isLarge ? 'text-base' : 'text-xs'} font-medium px-2 py-1 rounded-full ${
            change >= 0 ? 'text-kpi-success bg-kpi-success/10' : 'text-kpi-error bg-kpi-error/10'
          }`}>
            {change >= 0 ? <TrendingUp className={isLarge ? 'w-5 h-5' : 'w-3 h-3'} /> : <TrendingDown className={isLarge ? 'w-5 h-5' : 'w-3 h-3'} />}
            {change >= 0 ? '+' : ''}{change.toFixed(1)}%
          </div>
        )}
      </div>
      <p className={`${isLarge ? 'text-xl' : 'text-sm'} text-muted-foreground mb-1`}>{title}</p>
      <p className={`${isLarge ? 'text-5xl' : 'text-2xl'} font-bold text-foreground tracking-tight`}>{value}</p>
      {subtitle && <p className={`${isLarge ? 'text-lg' : 'text-xs'} text-muted-foreground mt-2`}>{subtitle}</p>}
    </div>
  );
}

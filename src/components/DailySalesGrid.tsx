interface DailySalesGridProps {
  dailySales: { day: string; value: number }[];
  selectedMonth: string; // "YYYY-MM"
  isVertical: boolean;
}

export function DailySalesGrid({ dailySales, selectedMonth, isVertical }: DailySalesGridProps) {
  const [year, month] = selectedMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  // Build lookup map
  const salesByDay: Record<string, number> = {};
  dailySales.forEach(d => { salesByDay[d.day] = d.value; });

  // Generate all days
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const dayStr = String(i + 1).padStart(2, '0');
    return { day: dayStr, value: salesByDay[dayStr] || 0 };
  });

  const maxValue = Math.max(...days.map(d => d.value), 1);

  return (
    <div className={`grid grid-cols-7 ${isVertical ? 'gap-0.5' : 'gap-1'}`}>
      {days.map(d => {
        const intensity = d.value > 0 ? Math.max(0.15, d.value / maxValue) : 0;
        return (
          <div
            key={d.day}
            className={`
              rounded-md flex flex-col items-center justify-center
              ${isVertical ? 'py-0.5' : 'py-1'}
              ${d.value > 0
                ? 'border border-blue-500/30'
                : 'bg-secondary/30 border border-border/20'
              }
              transition-colors
            `}
            style={d.value > 0 ? { backgroundColor: `hsla(217, 91%, 60%, ${intensity * 0.35})` } : undefined}
          >
            <span className={`${isVertical ? 'text-[9px]' : 'text-[10px]'} text-muted-foreground leading-none`}>
              {d.day}
            </span>
            <span className={`
              ${isVertical ? 'text-xs' : 'text-sm'} font-bold leading-tight
              ${d.value > 0 ? 'text-foreground' : 'text-muted-foreground/40'}
            `}>
              {d.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

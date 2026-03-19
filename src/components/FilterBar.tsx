import { useMemo, useState } from 'react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { users } from '@/data/mockData';

interface FilterBarProps {
  selectedYear: number;
  selectedMonth: number;
  selectedSeller: string;
  onYearChange: (y: number) => void;
  onMonthChange: (m: number) => void;
  onSellerChange: (s: string) => void;
  showSellerFilter?: boolean;
}

const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function FilterBar({ selectedYear, selectedMonth, selectedSeller, onYearChange, onMonthChange, onSellerChange, showSellerFilter = true }: FilterBarProps) {
  const now = new Date();
  const sellers = useMemo(() => users.filter(u => u.role === 'seller' && u.status === 'active'), []);

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Select value={String(selectedYear)} onValueChange={(v) => onYearChange(Number(v))}>
        <SelectTrigger className="w-[100px] bg-secondary border-border/50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={String(now.getFullYear())}>{now.getFullYear()}</SelectItem>
          <SelectItem value={String(now.getFullYear() - 1)}>{now.getFullYear() - 1}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={String(selectedMonth)} onValueChange={(v) => onMonthChange(Number(v))}>
        <SelectTrigger className="w-[140px] bg-secondary border-border/50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map((m, i) => (
            <SelectItem key={i} value={String(i)}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showSellerFilter && (
        <Select value={selectedSeller} onValueChange={onSellerChange}>
          <SelectTrigger className="w-[180px] bg-secondary border-border/50">
            <SelectValue placeholder="Todos vendedores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos vendedores</SelectItem>
            {sellers.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

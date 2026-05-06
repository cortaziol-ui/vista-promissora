import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useSalesData } from '@/contexts/SalesDataContext';
import { useMonthlyData } from '@/hooks/useMonthlyData';
import { getCurrentMonth } from '@/lib/dateUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { useRoletaSpins } from '@/hooks/useRoletaSpins';
import { isVendorActiveToday } from '@/lib/vendorActive';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Gift, Zap, Target, Crown, History, Trophy, PartyPopper, Pencil, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';

interface PrizeOption {
  label: string;
  peso: number;
  color: string;
}

const PRIZES_VOLUME_DIARIO: PrizeOption[] = [
  { label: 'Monster / Red Bull', peso: 35, color: '#00BCD4' },
  { label: 'Coca + Salgado', peso: 25, color: '#4CAF50' },
  { label: 'Vale Marmita R$ 20', peso: 20, color: '#FF9800' },
  { label: 'Pix de R$ 20', peso: 12, color: '#9C27B0' },
  { label: 'Pix de R$ 30', peso: 6, color: '#E91E63' },
  { label: 'Pix de R$ 50', peso: 2, color: '#FFD700' },
];

const PRIZES_META_SEMANAL: PrizeOption[] = [
  { label: 'Pix de R$ 40', peso: 40, color: '#4CAF50' },
  { label: 'Caixa de Monster', peso: 25, color: '#00BCD4' },
  { label: 'Vale iFood R$ 50', peso: 10, color: '#FF5722' },
  { label: 'Pix de R$ 60', peso: 10, color: '#9C27B0' },
  { label: 'Saída 1h mais cedo', peso: 10, color: '#E91E63' },
  { label: 'Vale Transp/Gas R$ 100', peso: 5, color: '#FFD700' },
];

const PRIZES_META_MENSAL_70: PrizeOption[] = [
  { label: 'Vale Almoço R$ 50', peso: 26, color: '#FF9800' },
  { label: '1 Pack Monster + Lanche', peso: 24, color: '#00BCD4' },
  { label: 'Meio período off', peso: 18, color: '#E91E63' },
  { label: 'Pix de R$ 50', peso: 12, color: '#9C27B0' },
  { label: 'Vale Combustível R$ 150', peso: 10, color: '#4CAF50' },
  { label: 'Pix de R$ 100', peso: 10, color: '#FFD700' },
];

const PRIZES_META_MENSAL_100: PrizeOption[] = [
  { label: 'Day off', peso: 20, color: '#00BCD4' },
  { label: 'Vale Massagem', peso: 20, color: '#E91E63' },
  { label: 'Jantar p/ 2 até R$ 150', peso: 20, color: '#FF9800' },
  { label: 'Vale Almoço R$ 80', peso: 20, color: '#4CAF50' },
  { label: 'Pix de R$ 100', peso: 15, color: '#9C27B0' },
  { label: 'Pix de R$ 200', peso: 5, color: '#FFD700' },
];

const PRIZES_POR_VENDA: PrizeOption[] = [
  { label: 'Salva de palmas da equipe', peso: 20, color: '#4CAF50' },
  { label: 'Puxar a buzina das vendas', peso: 25, color: '#FF5722' },
  { label: 'Soquinho em toda a equipe', peso: 15, color: '#00BCD4' },
  { label: 'Puxar grito de guerra', peso: 40, color: '#9C27B0' },
];

const DEFAULT_PRIZE_MAP: Record<string, PrizeOption[]> = {
  por_venda: PRIZES_POR_VENDA,
  volume_diario: PRIZES_VOLUME_DIARIO,
  meta_semanal_100_limpa_nome: PRIZES_META_SEMANAL,
  meta_semanal_100_rating: PRIZES_META_SEMANAL,
  meta_mensal_70_limpa_nome: PRIZES_META_MENSAL_70,
  meta_mensal_70_rating: PRIZES_META_MENSAL_70,
  meta_mensal_100_limpa_nome: PRIZES_META_MENSAL_100,
  meta_mensal_100_rating: PRIZES_META_MENSAL_100,
};

// Mapa de chaves antigas pras novas (migra premios salvos no banco quando o
// usuario abre a roleta pela 1a vez depois desta mudanca; mesmos premios pra
// LN e RT como ponto de partida).
const LEGACY_PRIZE_KEY_MAP: Record<string, string[]> = {
  meta_semanal_100: ['meta_semanal_100_limpa_nome', 'meta_semanal_100_rating'],
  meta_mensal_70:   ['meta_mensal_70_limpa_nome',   'meta_mensal_70_rating'],
  meta_mensal_100:  ['meta_mensal_100_limpa_nome',  'meta_mensal_100_rating'],
};

interface MotiveConfig {
  id: string;
  titulo: string;
  descricao: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const MOTIVES: MotiveConfig[] = [
  {
    id: 'por_venda',
    titulo: 'Por Venda',
    descricao: '1 giro por venda realizada',
    icon: <PartyPopper className="w-5 h-5" />,
    color: '#FF5722',
    bgColor: 'rgba(255, 87, 34, 0.15)',
  },
  {
    id: 'volume_diario',
    titulo: 'Volume Diário',
    descricao: '3 vendas em um dia (LN + Rating somados)',
    icon: <Zap className="w-5 h-5" />,
    color: '#00BCD4',
    bgColor: 'rgba(0, 188, 212, 0.15)',
  },
  {
    id: 'meta_semanal_100_limpa_nome',
    titulo: 'Meta Semanal Limpa Nome',
    descricao: '100% da meta semanal de Limpa Nome atingida',
    icon: <Target className="w-5 h-5" />,
    color: '#4CAF50',
    bgColor: 'rgba(76, 175, 80, 0.15)',
  },
  {
    id: 'meta_semanal_100_rating',
    titulo: 'Meta Semanal Rating',
    descricao: '100% da meta semanal de Rating atingida',
    icon: <Target className="w-5 h-5" />,
    color: '#4CAF50',
    bgColor: 'rgba(76, 175, 80, 0.15)',
  },
  {
    id: 'meta_mensal_70_limpa_nome',
    titulo: '70% Meta Mensal Limpa Nome',
    descricao: '70% da meta mensal de Limpa Nome atingida',
    icon: <Trophy className="w-5 h-5" />,
    color: '#FF9800',
    bgColor: 'rgba(255, 152, 0, 0.15)',
  },
  {
    id: 'meta_mensal_70_rating',
    titulo: '70% Meta Mensal Rating',
    descricao: '70% da meta mensal de Rating atingida',
    icon: <Trophy className="w-5 h-5" />,
    color: '#FF9800',
    bgColor: 'rgba(255, 152, 0, 0.15)',
  },
  {
    id: 'meta_mensal_100_limpa_nome',
    titulo: '100% Meta Mensal Limpa Nome',
    descricao: '100% da meta mensal de Limpa Nome atingida',
    icon: <Crown className="w-5 h-5" />,
    color: '#FFD700',
    bgColor: 'rgba(255, 215, 0, 0.15)',
  },
  {
    id: 'meta_mensal_100_rating',
    titulo: '100% Meta Mensal Rating',
    descricao: '100% da meta mensal de Rating atingida',
    icon: <Crown className="w-5 h-5" />,
    color: '#FFD700',
    bgColor: 'rgba(255, 215, 0, 0.15)',
  },
];


function weightedRandom(prizes: PrizeOption[]): PrizeOption {
  const totalWeight = prizes.reduce((s, p) => s + p.peso, 0);
  let r = Math.random() * totalWeight;
  for (const p of prizes) {
    r -= p.peso;
    if (r <= 0) return p;
  }
  return prizes[prizes.length - 1];
}

export default function RoletaPage() {
  const { vendedores, clientes, loading } = useSalesData();
  const { vendedorStats } = useMonthlyData(getCurrentMonth());
  const lnData = useMonthlyData(getCurrentMonth(), 'LIMPA_NOME');
  const rtData = useMonthlyData(getCurrentMonth(), 'RATING');
  const { isSeller, isManager, isAdmin, user } = useAuth();
  const { activeAccountId, accounts } = useTenant();
  const isConsolidatedSeller = user?.role === 'seller' && accounts.length > 1 && !activeAccountId;
  const { spins, loading: spinsLoading, saveSpin, updateSpin, checkRateLimit, getSpinsUsedToday } = useRoletaSpins();
  const canEditSpin = isAdmin || isManager;

  const [selectedVendedor, setSelectedVendedor] = useState('');
  const [selectedMotivo, setSelectedMotivo] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ prize: PrizeOption; motive: MotiveConfig } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [pendingSpin, setPendingSpin] = useState<{
    vendedor: string; motivo: string; motivoTitulo: string;
    premio: string; timestamp: Date;
  } | null>(null);
  const [validationError, setValidationError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [wheelAngle, setWheelAngle] = useState(0);
  const targetPrizeRef = useRef<PrizeOption | null>(null);

  // --- Custom prizes (persisted in company_settings) ---
  const [prizeMap, setPrizeMap] = useState<Record<string, PrizeOption[]>>(DEFAULT_PRIZE_MAP);
  const [editingPrize, setEditingPrize] = useState<{ motivo: string; index: number } | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editPeso, setEditPeso] = useState(0);

  // Load custom prizes from DB (scoped to active account)
  useEffect(() => {
    if (!activeAccountId) return;
    (async () => {
      try {
        const { data } = await (supabase.from as any)('company_settings')
          .select('value')
          .eq('account_id', activeAccountId)
          .eq('key', 'roleta_prizes')
          .maybeSingle();
        // Reset to defaults when switching accounts
        const merged = { ...DEFAULT_PRIZE_MAP };
        if (data?.value) {
          const saved = data.value as Record<string, Array<{ label: string; peso: number; color: string }>>;
          // Helper: aplica os premios salvos numa chave especifica de merged
          const applyTo = (targetKey: string, prizes: Array<{ label: string; peso: number; color: string }>) => {
            if (!merged[targetKey] || !Array.isArray(prizes)) return;
            merged[targetKey] = prizes.map((p, i) => ({
              label: p.label,
              peso: p.peso,
              color: p.color || merged[targetKey]?.[i]?.color || '#4CAF50',
            }));
          };
          for (const [motivo, prizes] of Object.entries(saved)) {
            if (merged[motivo]) {
              applyTo(motivo, prizes);
            } else if (LEGACY_PRIZE_KEY_MAP[motivo]) {
              // Chave antiga (pre-split LN/RT): herda os mesmos premios pra ambas chaves novas
              for (const newKey of LEGACY_PRIZE_KEY_MAP[motivo]) {
                applyTo(newKey, prizes);
              }
            }
          }
        }
        setPrizeMap(merged);
      } catch {
        // fallback to defaults
      }
    })();
  }, [activeAccountId]);

  const savePrizeMap = useCallback(async (updated: Record<string, PrizeOption[]>) => {
    if (!activeAccountId) {
      toast.error('Sem conta ativa — selecione uma conta antes de editar prêmios.');
      return;
    }
    setPrizeMap(updated);
    try {
      const payload = Object.fromEntries(
        Object.entries(updated).map(([k, v]) => [k, v.map(p => ({ label: p.label, peso: p.peso, color: p.color }))])
      );
      const { error } = await (supabase.from as any)('company_settings')
        .upsert(
          { account_id: activeAccountId, key: 'roleta_prizes', value: payload as any, updated_at: new Date().toISOString() },
          { onConflict: 'account_id,key' }
        );
      if (error) throw error;
      toast.success('Prêmio atualizado!');
    } catch {
      toast.error('Erro ao salvar prêmio.');
    }
  }, [activeAccountId]);

  const handleEditPrize = (motivo: string, index: number) => {
    const prize = prizeMap[motivo]?.[index];
    if (!prize) return;
    setEditingPrize({ motivo, index });
    setEditLabel(prize.label);
    setEditPeso(prize.peso);
  };

  const handleSavePrize = () => {
    if (!editingPrize) return;
    const { motivo, index } = editingPrize;
    const updated = { ...prizeMap };
    updated[motivo] = [...updated[motivo]];
    updated[motivo][index] = { ...updated[motivo][index], label: editLabel, peso: editPeso };
    savePrizeMap(updated);
    setEditingPrize(null);
  };

  // Save spin to Supabase after animation completes
  useEffect(() => {
    if (!pendingSpin) return;
    const { vendedor, motivo, motivoTitulo, premio, timestamp } = pendingSpin;
    // Em modo consolidated (vendasgeral), resolve account_id via vendedor selecionado.
    // Caso contrário, o hook usa activeAccountId.
    const vendorRecord = vendedores.find((v) => v.nome === vendedor);
    const accountIdOverride = isConsolidatedSeller ? vendorRecord?.accountId : undefined;
    saveSpin(
      {
        vendedor,
        motivo,
        motivoTitulo,
        premio,
        data: timestamp.toLocaleDateString('pt-BR'),
        hora: timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        status: 'pendente',
      },
      accountIdOverride,
    ).then(() => setPendingSpin(null));
  }, [pendingSpin, saveSpin, vendedores, isConsolidatedSeller]);

  const currentMotive = useMemo(() => MOTIVES.find(m => m.id === selectedMotivo), [selectedMotivo]);
  const currentPrizes = useMemo(() => prizeMap[selectedMotivo] || prizeMap.volume_diario, [selectedMotivo, prizeMap]);

  // Draw wheel
  const drawWheel = useCallback((angle: number, prizes: PrizeOption[]) => {
    try {
    const canvas = canvasRef.current;
    if (!canvas || prizes.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displaySize = 320;
    canvas.width = displaySize * dpr;
    canvas.height = displaySize * dpr;
    canvas.style.width = `${displaySize}px`;
    canvas.style.height = `${displaySize}px`;
    ctx.scale(dpr, dpr);

    const center = displaySize / 2;
    const radius = center - 15;
    const segments = prizes.length;
    const anglePerSegment = (Math.PI * 2) / segments;

    ctx.clearRect(0, 0, displaySize, displaySize);

    // Outer ring glow
    ctx.beginPath();
    ctx.arc(center, center, radius + 6, 0, Math.PI * 2);
    const glowGrad = ctx.createRadialGradient(center, center, radius - 5, center, center, radius + 8);
    glowGrad.addColorStop(0, 'rgba(79, 110, 247, 0)');
    glowGrad.addColorStop(1, 'rgba(79, 110, 247, 0.3)');
    ctx.fillStyle = glowGrad;
    ctx.fill();

    prizes.forEach((p, i) => {
      const startAngle = i * anglePerSegment + angle;
      const endAngle = startAngle + anglePerSegment;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();

      const grad = ctx.createRadialGradient(center, center, 0, center, center, radius);
      grad.addColorStop(0, adjustBrightness(p.color, 0.6));
      grad.addColorStop(1, p.color);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + anglePerSegment / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const label = p.label;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Inter, system-ui';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 3;

      const words = label.split(' ');
      if (words.length <= 2) {
        ctx.fillText(label, radius * 0.62, 0);
      } else {
        const mid = Math.ceil(words.length / 2);
        ctx.fillText(words.slice(0, mid).join(' '), radius * 0.62, -7);
        ctx.fillText(words.slice(mid).join(' '), radius * 0.62, 7);
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    });

    // Center circle
    const centerGrad = ctx.createRadialGradient(center, center, 0, center, center, 30);
    centerGrad.addColorStop(0, '#2a2d4a');
    centerGrad.addColorStop(1, '#1a1d35');
    ctx.beginPath();
    ctx.arc(center, center, 28, 0, Math.PI * 2);
    ctx.fillStyle = centerGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎰', center, center);

    // Pointer (top)
    ctx.beginPath();
    ctx.moveTo(center - 14, 4);
    ctx.lineTo(center + 14, 4);
    ctx.lineTo(center, 28);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    } catch (e) {
      console.error('[RoletaPage] drawWheel error:', e);
    }
  }, []);

  useEffect(() => {
    drawWheel(wheelAngle, currentPrizes);
  }, [wheelAngle, drawWheel, currentPrizes]);

  useEffect(() => {
    drawWheel(0, currentPrizes);
  }, [drawWheel, currentPrizes]);

  // Re-draw wheel after loading finishes (canvas not in DOM during loading)
  useEffect(() => {
    if (!loading && !spinsLoading) {
      drawWheel(wheelAngle, currentPrizes);
    }
  }, [loading, spinsLoading, drawWheel, wheelAngle, currentPrizes]);

  // Count today's sales for a vendor (LIMPA NOME + RATING = 2)
  const getTodaySalesCount = useCallback((vendedorNome: string) => {
    const today = new Date().toLocaleDateString('pt-BR');
    return clientes
      .filter(c => c.vendedor === vendedorNome && c.data === today)
      .reduce((s, c) => s + (c.servico === 'LIMPA NOME + RATING' ? 2 : 1), 0);
  }, [clientes]);

  // Available spins for "por_venda"
  const availableSpins = useMemo(() => {
    if (!selectedVendedor) return 0;
    const todaySales = getTodaySalesCount(selectedVendedor);
    const usedSpins = getSpinsUsedToday(selectedVendedor);
    return Math.max(0, todaySales - usedSpins);
  }, [selectedVendedor, getTodaySalesCount, getSpinsUsedToday]);

  const validateSpin = useCallback(async (): Promise<string | null> => {
    if (!selectedVendedor) return 'Selecione um vendedor';
    if (!selectedMotivo) return 'Selecione um motivo';

    const vendedor = vendedores.find(v => v.nome === selectedVendedor);
    if (!vendedor) return 'Vendedor não encontrado';

    const todaySales = getTodaySalesCount(selectedVendedor);
    const lnStat = lnData.vendedorStats.find(s => s.vendedor.nome === selectedVendedor);
    const rtStat = rtData.vendedorStats.find(s => s.vendedor.nome === selectedVendedor);

    if (selectedMotivo === 'por_venda') {
      if (availableSpins <= 0) {
        return `Nenhum giro disponível. Faça uma venda para liberar! 💪`;
      }
      return null;
    }

    if (selectedMotivo === 'volume_diario' && todaySales < 3) {
      return `Você tem ${todaySales} venda${todaySales !== 1 ? 's' : ''} hoje. Precisa de 3 para girar. 💪`;
    }

    // Helper interno: valida meta semanal/mensal pra um servico especifico
    const validateMeta = (
      servicoLabel: string,
      stat: typeof lnStat,
      type: 'semanal_100' | 'mensal_70' | 'mensal_100',
    ): string | null => {
      const meta = lnData.vendorGoals.get(vendedor.id) ?? 0;
      const metaServico =
        servicoLabel === 'Limpa Nome'
          ? (lnData.vendorGoals.get(vendedor.id) ?? 0)
          : (rtData.vendorGoals.get(vendedor.id) ?? 0);
      if (metaServico <= 0) {
        return `Vendedor sem meta de ${servicoLabel} cadastrada para este mês. Configure em Settings. 💪`;
      }
      const vendas = stat?.vendas ?? 0;
      const pct = (vendas / metaServico) * 100;

      if (type === 'semanal_100') {
        const weeklyTarget = metaServico / 4;
        if (vendas < weeklyTarget) {
          return `Meta semanal ${servicoLabel}: ${weeklyTarget > 0 ? ((vendas / weeklyTarget) * 100).toFixed(1) : 0}%. Precisa de 100%. 💪`;
        }
      } else if (type === 'mensal_70' && pct < 70) {
        return `Meta mensal ${servicoLabel}: ${pct.toFixed(1)}%. Precisa de 70%. 💪`;
      } else if (type === 'mensal_100' && pct < 100) {
        return `Meta mensal ${servicoLabel}: ${pct.toFixed(1)}%. Precisa de 100%. 💪`;
      }
      // ts-noop
      void meta;
      return null;
    };

    if (selectedMotivo === 'meta_semanal_100_limpa_nome') return validateMeta('Limpa Nome', lnStat, 'semanal_100');
    if (selectedMotivo === 'meta_semanal_100_rating')     return validateMeta('Rating',     rtStat, 'semanal_100');
    if (selectedMotivo === 'meta_mensal_70_limpa_nome')   return validateMeta('Limpa Nome', lnStat, 'mensal_70');
    if (selectedMotivo === 'meta_mensal_70_rating')       return validateMeta('Rating',     rtStat, 'mensal_70');
    if (selectedMotivo === 'meta_mensal_100_limpa_nome')  return validateMeta('Limpa Nome', lnStat, 'mensal_100');
    if (selectedMotivo === 'meta_mensal_100_rating')      return validateMeta('Rating',     rtStat, 'mensal_100');

    return null;
  }, [selectedVendedor, selectedMotivo, vendedores, lnData, rtData, availableSpins, getTodaySalesCount]);

  const handleSpin = useCallback(async () => {
    const error = await validateSpin();
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError('');

    const prizes = prizeMap[selectedMotivo] || prizeMap.volume_diario;
    const prize = weightedRandom(prizes);
    const motive = MOTIVES.find(m => m.id === selectedMotivo) ?? MOTIVES[0];
    targetPrizeRef.current = prize;

    const prizeIndex = prizes.indexOf(prize);
    const segAngle = 360 / prizes.length;
    const targetSegCenter = prizeIndex * segAngle + segAngle / 2;
    const stopAngle = (360 - targetSegCenter - 90 + 360) % 360;
    const fullSpins = 5 + Math.floor(Math.random() * 3);
    const totalDeg = fullSpins * 360 + stopAngle;

    setSpinning(true);

    const startAngle = wheelAngle;
    const duration = 5000;
    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Quartic ease-out for more dramatic deceleration
      const eased = 1 - Math.pow(1 - progress, 4);
      const currentAngle = startAngle + totalDeg * eased;
      setWheelAngle(currentAngle);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        setResult({ prize, motive });
        setShowResult(true);
        setPendingSpin({
          vendedor: selectedVendedor,
          motivo: selectedMotivo,
          motivoTitulo: motive.titulo,
          premio: prize.label,
          timestamp: new Date(),
        });
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [selectedVendedor, selectedMotivo, wheelAngle, validateSpin]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // --- Filtro de data para "Últimas Giradas" ---
  type DateFilter = '7d' | '14d' | '30d' | 'all' | 'custom';
  const [dateFilter, setDateFilter] = useState<DateFilter>('7d');
  const [customFrom, setCustomFrom] = useState<string>(''); // YYYY-MM-DD
  const [customTo, setCustomTo] = useState<string>('');

  // Converte "DD/MM/YYYY" do spin para Date local (00:00).
  const parseSpinDate = (data: string): Date | null => {
    const m = data.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    return new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
  };

  const HISTORY_LIMIT = 50;

  const filteredSpins = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let from: Date | null = null;
    let to: Date | null = null;

    if (dateFilter === '7d' || dateFilter === '14d' || dateFilter === '30d') {
      const days = dateFilter === '7d' ? 7 : dateFilter === '14d' ? 14 : 30;
      from = new Date(today);
      from.setDate(from.getDate() - (days - 1));
    } else if (dateFilter === 'custom') {
      if (customFrom) from = new Date(`${customFrom}T00:00:00`);
      if (customTo) {
        to = new Date(`${customTo}T00:00:00`);
        to.setHours(23, 59, 59, 999);
      }
    }

    return spins.filter(s => {
      const d = parseSpinDate(s.data);
      if (!d) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [spins, dateFilter, customFrom, customTo]);

  const recentSpins = filteredSpins.slice(0, HISTORY_LIMIT);
  const hiddenCount = filteredSpins.length - recentSpins.length;

  if (loading || spinsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Gift className="w-6 h-6 text-kpi-goal-pct" />
          Roleta Premiada
        </h1>
        <p className="text-muted-foreground text-sm">Seu desempenho merece ser recompensado 🍀</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Controls */}
        <div className="space-y-4">
          <div className="glass-card p-5 space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Selecione seu vendedor</label>
              <Select value={selectedVendedor} onValueChange={v => { setSelectedVendedor(v); setValidationError(''); }}>
                <SelectTrigger className="bg-secondary border-border/50">
                  <SelectValue placeholder="Escolha..." />
                </SelectTrigger>
                <SelectContent>
                  {vendedores.filter(isVendorActiveToday).map(v => (
                    <SelectItem key={v.id} value={v.nome}>
                      {v.avatar} {v.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Por qual motivo você está girando?</label>
              <Select value={selectedMotivo} onValueChange={v => { setSelectedMotivo(v); setValidationError(''); }}>
                <SelectTrigger className="bg-secondary border-border/50">
                  <SelectValue placeholder="Selecione o motivo..." />
                </SelectTrigger>
                <SelectContent>
                  {MOTIVES.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex items-center gap-2">
                        <span>{m.titulo}</span>
                        <span className="text-xs text-muted-foreground">({m.descricao})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedMotivo === 'por_venda' && selectedVendedor && (
              <div className={`p-3 rounded-lg text-sm font-medium ${availableSpins > 0 ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'}`}>
                {availableSpins > 0
                  ? `🎰 ${availableSpins} giro${availableSpins !== 1 ? 's' : ''} disponíve${availableSpins !== 1 ? 'is' : 'l'}!`
                  : 'Nenhum giro disponível. Faça uma venda para liberar!'}
              </div>
            )}

            {validationError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                {validationError}
              </div>
            )}

            <Button
              onClick={handleSpin}
              disabled={spinning || !selectedVendedor || !selectedMotivo}
              className="w-full h-12 text-lg font-bold"
              style={{ background: currentMotive?.color || undefined }}
            >
              {spinning ? '🎡 Girando...' : '🎰 GIRAR A ROLETA'}
            </Button>
          </div>

          {/* Motives info */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Motivos para Girar</h3>
            <div className="space-y-2">
              {MOTIVES.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: m.bgColor }}>
                  <div className="shrink-0" style={{ color: m.color }}>{m.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{m.titulo}</p>
                    <p className="text-xs text-muted-foreground">{m.descricao}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prizes info - show based on selected motive */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Prêmios — {currentMotive?.titulo || 'Volume Diário'}
            </h3>
            <div className="space-y-1.5">
              {currentPrizes.map((p, i) => (
                <div key={`${selectedMotivo}-${i}`} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-secondary/50 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                    <span className="text-foreground">{p.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isSeller && !isManager && <span className="text-xs text-muted-foreground">{p.peso}%</span>}
                    {isAdmin && (
                      <button
                        onClick={() => handleEditPrize(selectedMotivo || 'volume_diario', i)}
                        className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Wheel + History */}
        <div className="space-y-4">
          <div className="glass-card p-5 flex flex-col items-center">
            <h3 className="text-sm font-semibold text-foreground mb-4">🎡 Gire e descubra seu prêmio!</h3>
            <div className="relative">
              <canvas
                ref={canvasRef}
                style={{ width: 320, height: 320 }}
              />
            </div>
          </div>

          {/* History — hidden for sellers */}
          {!isSeller && <div className="glass-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Últimas Giradas</h3>
                <span className="text-xs text-muted-foreground">({filteredSpins.length})</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={dateFilter} onValueChange={v => setDateFilter(v as DateFilter)}>
                  <SelectTrigger className="h-8 w-[160px] bg-secondary border-border/50 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Últimos 7 dias</SelectItem>
                    <SelectItem value="14d">Últimos 14 dias</SelectItem>
                    <SelectItem value="30d">Últimos 30 dias</SelectItem>
                    <SelectItem value="all">Todo o histórico</SelectItem>
                    <SelectItem value="custom">Período personalizado</SelectItem>
                  </SelectContent>
                </Select>
                {dateFilter === 'custom' && (
                  <>
                    <Input
                      type="date"
                      value={customFrom}
                      max={customTo || undefined}
                      onChange={e => setCustomFrom(e.target.value)}
                      className="h-8 w-[150px] bg-secondary border-border/50 text-xs"
                      title="Data inicial"
                    />
                    <span className="text-xs text-muted-foreground">até</span>
                    <Input
                      type="date"
                      value={customTo}
                      min={customFrom || undefined}
                      onChange={e => setCustomTo(e.target.value)}
                      className="h-8 w-[150px] bg-secondary border-border/50 text-xs"
                      title="Data final"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        const today = new Date().toISOString().slice(0, 10);
                        setCustomFrom(today);
                        setCustomTo(today);
                      }}
                      title="Filtrar somente hoje"
                    >
                      Hoje
                    </Button>
                  </>
                )}
              </div>
            </div>
            {recentSpins.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {spins.length === 0 ? 'Nenhuma girada ainda. Vamos girar essa sorte! 🍀' : 'Nenhuma girada no período selecionado.'}
              </p>
            ) : (
              <div className="space-y-2">
                {recentSpins.map(s => {
                  const motive = MOTIVES.find(m => m.id === s.motivo);
                  const isPack = s.quantidadeTotal > 1;
                  const isPago = s.status === 'pago';
                  return (
                    <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/50 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{s.vendedor}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: motive?.bgColor, color: motive?.color }}>
                          {s.motivoTitulo}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-foreground">{s.premio}</span>
                        <span className="text-xs text-muted-foreground">{s.data} {s.hora}</span>
                        {isPack && (
                          <div className="flex items-center gap-1 bg-background/60 rounded-md px-1 py-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={!canEditSpin || s.quantidadeEntregue <= 0}
                              onClick={() => updateSpin(s.id, { quantidadeEntregue: s.quantidadeEntregue - 1 })}
                              title="Remover uma unidade entregue"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="text-xs font-mono tabular-nums min-w-[32px] text-center">
                              {s.quantidadeEntregue}/{s.quantidadeTotal}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={!canEditSpin || s.quantidadeEntregue >= s.quantidadeTotal}
                              onClick={() => updateSpin(s.id, { quantidadeEntregue: s.quantidadeEntregue + 1 })}
                              title="Marcar mais uma unidade entregue"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                        <button
                          type="button"
                          disabled={!canEditSpin || isPack}
                          onClick={() => updateSpin(s.id, { status: isPago ? 'pendente' : 'pago' })}
                          className={`text-xs px-2 py-0.5 rounded-full transition ${isPago ? 'bg-green-500/15 text-green-400' : 'bg-amber-500/15 text-amber-400'} ${canEditSpin && !isPack ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
                          title={isPack ? 'Atualize pelo contador' : (canEditSpin ? 'Clique para alternar status' : '')}
                        >
                          {isPago ? '✅ Pago' : '⏳ Pendente'}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {hiddenCount > 0 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Mostrando {recentSpins.length} de {filteredSpins.length} giradas. Refine o período para ver as demais.
                  </p>
                )}
              </div>
            )}
          </div>}
        </div>
      </div>

      {/* Result Modal */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="bg-card border-border text-center">
          <DialogHeader>
            <DialogTitle className="text-xl">🎉 PARABÉNS, {selectedVendedor}!</DialogTitle>
          </DialogHeader>
          {result && (
            <div className="space-y-4 py-4">
              <div className="text-4xl font-bold" style={{ color: result.prize.color }}>
                🎁 {result.prize.label}
              </div>
              <p className="text-muted-foreground">
                Motivo: <span className="text-foreground font-medium">{result.motive.titulo}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {result.prize.peso <= 6 ? 'UAUUU! Que sorte incrível! 🤑' : 'Que legal! Continue assim! ⚡'}
              </p>
              <div className="flex gap-3 justify-center pt-2">
                <Button onClick={() => setShowResult(false)}>Voltar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Prize Modal (admin only) */}
      <Dialog open={!!editingPrize} onOpenChange={open => !open && setEditingPrize(null)}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Editar Prêmio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Nome do prêmio</label>
              <Input
                value={editLabel}
                onChange={e => setEditLabel(e.target.value)}
                className="bg-secondary border-border/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Peso (%)</label>
              <Input
                type="number"
                min={1}
                max={100}
                value={editPeso}
                onChange={e => setEditPeso(Number(e.target.value))}
                className="bg-secondary border-border/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPrize(null)}>Cancelar</Button>
            <Button onClick={handleSavePrize} disabled={!editLabel.trim() || editPeso <= 0}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function adjustBrightness(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
}

function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}

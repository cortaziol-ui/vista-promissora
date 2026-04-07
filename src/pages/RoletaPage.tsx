import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useSalesData } from '@/contexts/SalesDataContext';
import { useMonthlyData } from '@/hooks/useMonthlyData';
import { getCurrentMonth } from '@/lib/dateUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useRoletaSpins } from '@/hooks/useRoletaSpins';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Gift, Zap, Target, Crown, History, Trophy } from 'lucide-react';

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

const PRIZE_MAP: Record<string, PrizeOption[]> = {
  volume_diario: PRIZES_VOLUME_DIARIO,
  meta_semanal_100: PRIZES_META_SEMANAL,
  meta_mensal_70: PRIZES_META_MENSAL_70,
  meta_mensal_100: PRIZES_META_MENSAL_100,
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
    id: 'volume_diario',
    titulo: 'Volume Diário',
    descricao: '3 vendas em um dia',
    icon: <Zap className="w-5 h-5" />,
    color: '#00BCD4',
    bgColor: 'rgba(0, 188, 212, 0.15)',
  },
  {
    id: 'meta_semanal_100',
    titulo: 'Meta Semanal',
    descricao: '100% da meta semanal atingida',
    icon: <Target className="w-5 h-5" />,
    color: '#4CAF50',
    bgColor: 'rgba(76, 175, 80, 0.15)',
  },
  {
    id: 'meta_mensal_70',
    titulo: 'Meta Mensal 70%',
    descricao: '70% da meta mensal atingida',
    icon: <Trophy className="w-5 h-5" />,
    color: '#FF9800',
    bgColor: 'rgba(255, 152, 0, 0.15)',
  },
  {
    id: 'meta_mensal_100',
    titulo: 'Meta Mensal 100%',
    descricao: '100% da meta mensal atingida',
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
  const { isSeller, isManager } = useAuth();
  const { spins, loading: spinsLoading, saveSpin, checkRateLimit } = useRoletaSpins();

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

  // Save spin to Supabase after animation completes
  useEffect(() => {
    if (!pendingSpin) return;
    const { vendedor, motivo, motivoTitulo, premio, timestamp } = pendingSpin;
    saveSpin({
      vendedor,
      motivo,
      motivoTitulo,
      premio,
      data: timestamp.toLocaleDateString('pt-BR'),
      hora: timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'pendente',
    }).then(() => setPendingSpin(null));
  }, [pendingSpin, saveSpin]);

  const currentMotive = useMemo(() => MOTIVES.find(m => m.id === selectedMotivo), [selectedMotivo]);
  const currentPrizes = useMemo(() => PRIZE_MAP[selectedMotivo] || PRIZES_VOLUME_DIARIO, [selectedMotivo]);

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

  const validateSpin = useCallback(async (): Promise<string | null> => {
    if (!selectedVendedor) return 'Selecione um vendedor';
    if (!selectedMotivo) return 'Selecione um motivo';

    const vendedor = vendedores.find(v => v.nome === selectedVendedor);
    if (!vendedor) return 'Vendedor não encontrado';

    const { allowed, hoursRemaining } = await checkRateLimit(selectedVendedor, selectedMotivo);
    if (!allowed) {
      return `Próxima girada disponível em ${Math.ceil(hoursRemaining)}h`;
    }

    const today = new Date().toLocaleDateString('pt-BR');
    const vendorClientes = clientes.filter(c => c.vendedor === selectedVendedor);
    const todayClientes = vendorClientes.filter(c => c.data === today);
    const stat = vendedorStats.find(s => s.vendedor.nome === selectedVendedor);

    if (selectedMotivo === 'volume_diario' && todayClientes.length < 3) {
      return `Você tem ${todayClientes.length} vendas hoje. Precisa de 3 para girar. 💪`;
    }

    if (selectedMotivo === 'meta_semanal_100') {
      const weeklyTarget = (stat?.vendedor.meta || 0) / 4;
      const weekSales = stat?.vendas || 0;
      if (weekSales < weeklyTarget) {
        return `Meta semanal: ${weeklyTarget > 0 ? ((weekSales / weeklyTarget) * 100).toFixed(1) : 0}%. Precisa de 100%. 💪`;
      }
    }

    if (selectedMotivo === 'meta_mensal_70') {
      const pct = stat?.pctMeta || 0;
      if (pct < 70) {
        return `Meta mensal: ${pct.toFixed(1)}%. Precisa de 70%. 💪`;
      }
    }

    if (selectedMotivo === 'meta_mensal_100') {
      const pct = stat?.pctMeta || 0;
      if (pct < 100) {
        return `Meta mensal: ${pct.toFixed(1)}%. Precisa de 100%. 💪`;
      }
    }

    return null;
  }, [selectedVendedor, selectedMotivo, vendedores, clientes, vendedorStats, checkRateLimit]);

  const handleSpin = useCallback(async () => {
    const error = await validateSpin();
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError('');

    const prizes = PRIZE_MAP[selectedMotivo] || PRIZES_VOLUME_DIARIO;
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

  const recentSpins = spins.slice(0, 10);

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
                  {vendedores.map(v => (
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
              {currentPrizes.map(p => (
                <div key={p.label} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-secondary/50 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                    <span className="text-foreground">{p.label}</span>
                  </div>
                  {!isSeller && !isManager && <span className="text-xs text-muted-foreground">{p.peso}%</span>}
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
          {!isSeller && !isManager && <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Últimas Giradas</h3>
            </div>
            {recentSpins.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma girada ainda. Vamos girar essa sorte! 🍀</p>
            ) : (
              <div className="space-y-2">
                {recentSpins.map(s => {
                  const motive = MOTIVES.find(m => m.id === s.motivo);
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
                        <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'pago' ? 'bg-green-500/15 text-green-400' : 'bg-amber-500/15 text-amber-400'}`}>
                          {s.status === 'pago' ? '✅ Pago' : '⏳ Pendente'}
                        </span>
                      </div>
                    </div>
                  );
                })}
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

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useSalesData } from '@/contexts/SalesDataContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Gift, Zap, Target, Crown, History, Trophy } from 'lucide-react';

interface PrizeOption {
  label: string;
  peso: number;
  color: string;
}

const PRIZES: PrizeOption[] = [
  { label: 'Monster / Red Bull', peso: 35, color: '#00BCD4' },
  { label: 'Coca + Salgado', peso: 25, color: '#4CAF50' },
  { label: 'Vale Marmita R$ 20', peso: 20, color: '#FF9800' },
  { label: 'Pix de R$ 20', peso: 12, color: '#9C27B0' },
  { label: 'Pix de R$ 30', peso: 6, color: '#E91E63' },
  { label: 'Pix de R$ 50', peso: 2, color: '#FFD700' },
];

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

interface SpinRecord {
  id: string;
  vendedor: string;
  motivo: string;
  motivoTitulo: string;
  premio: string;
  data: string;
  hora: string;
  status: 'pendente' | 'pago';
}

const STORAGE_KEY_SPINS = 'roleta_historico_v2';
const STORAGE_KEY_LIMITS = 'roleta_limites_v2';

function loadSpins(): SpinRecord[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SPINS);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}
function saveSpins(spins: SpinRecord[]) {
  localStorage.setItem(STORAGE_KEY_SPINS, JSON.stringify(spins));
}
function loadLimits(): Record<string, string> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_LIMITS);
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
}
function saveLimits(limits: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY_LIMITS, JSON.stringify(limits));
}

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
  const { vendedores, clientes, vendedorStats } = useSalesData();
  const [selectedVendedor, setSelectedVendedor] = useState('');
  const [selectedMotivo, setSelectedMotivo] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ prize: PrizeOption; motive: MotiveConfig } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [spins, setSpins] = useState<SpinRecord[]>(loadSpins);
  const [validationError, setValidationError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [wheelAngle, setWheelAngle] = useState(0);
  const spinVelocityRef = useRef(0);
  const targetPrizeRef = useRef<PrizeOption | null>(null);

  const currentMotive = useMemo(() => MOTIVES.find(m => m.id === selectedMotivo), [selectedMotivo]);

  // Draw wheel
  const drawWheel = useCallback((angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
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
    const segments = PRIZES.length;
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

    PRIZES.forEach((p, i) => {
      const startAngle = i * anglePerSegment + angle;
      const endAngle = startAngle + anglePerSegment;

      // Segment fill
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();

      const grad = ctx.createRadialGradient(center, center, 0, center, center, radius);
      grad.addColorStop(0, adjustBrightness(p.color, 0.6));
      grad.addColorStop(1, p.color);
      ctx.fillStyle = grad;
      ctx.fill();

      // Segment border
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + anglePerSegment / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Wrap text for long labels
      const label = p.label;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px Inter, system-ui';
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

    // Center icon
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
  }, []);

  useEffect(() => {
    drawWheel(wheelAngle);
  }, [wheelAngle, drawWheel]);

  // Initial draw
  useEffect(() => {
    drawWheel(0);
  }, [drawWheel]);

  const validateSpin = useCallback((): string | null => {
    if (!selectedVendedor) return 'Selecione um vendedor';
    if (!selectedMotivo) return 'Selecione um motivo';

    const vendedor = vendedores.find(v => v.nome === selectedVendedor);
    if (!vendedor) return 'Vendedor não encontrado';

    const limits = loadLimits();
    const limitKey = `${selectedVendedor}_${selectedMotivo}`;
    const lastSpin = limits[limitKey];

    if (lastSpin) {
      const lastDate = new Date(lastSpin);
      const now = new Date();
      const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);

      if (selectedMotivo === 'volume_diario' && diffHours < 24) {
        return `Próxima girada disponível em ${Math.ceil(24 - diffHours)}h`;
      }
      if (['meta_semanal_100', 'meta_mensal_70', 'meta_mensal_100'].includes(selectedMotivo) && diffHours < 168) {
        return `Próxima girada disponível em ${Math.ceil(168 - diffHours)}h`;
      }
    }

    // Validate actual achievement
    const today = new Date().toLocaleDateString('pt-BR');
    const vendorClientes = clientes.filter(c => c.vendedor === selectedVendedor);
    const todayClientes = vendorClientes.filter(c => c.data === today);
    const stat = vendedorStats.find(s => s.vendedor.nome === selectedVendedor);

    if (selectedMotivo === 'volume_diario' && todayClientes.length < 3) {
      return `Você tem ${todayClientes.length} vendas hoje. Precisa de 3 para girar. 💪`;
    }

    if (selectedMotivo === 'meta_semanal_100') {
      const weeklyTarget = (stat?.vendedor.meta || 0) / 4;
      const weekFat = stat?.faturamento || 0;
      if (weekFat < weeklyTarget) {
        return `Meta semanal: ${formatPercent(weekFat, weeklyTarget)}. Precisa de 100%. 💪`;
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
  }, [selectedVendedor, selectedMotivo, vendedores, clientes, vendedorStats]);

  const handleSpin = useCallback(() => {
    const error = validateSpin();
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError('');

    const prize = weightedRandom(PRIZES);
    const motive = MOTIVES.find(m => m.id === selectedMotivo)!;
    targetPrizeRef.current = prize;

    // Calculate target angle to land on the prize
    const prizeIndex = PRIZES.indexOf(prize);
    const segAngle = 360 / PRIZES.length;
    // The pointer is at the top (270° in standard math), we want the prize segment center there
    const targetSegCenter = prizeIndex * segAngle + segAngle / 2;
    const stopAngle = (360 - targetSegCenter - 90 + 360) % 360;
    const fullSpins = 5 + Math.floor(Math.random() * 3); // 5-7 full spins
    const totalDeg = fullSpins * 360 + stopAngle;

    setSpinning(true);

    // Animate with easing
    const startAngle = wheelAngle;
    const duration = 4000;
    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out for natural deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentAngle = startAngle + totalDeg * eased;
      setWheelAngle(currentAngle);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        setResult({ prize, motive });
        setShowResult(true);

        // Save spin record
        const now = new Date();
        const record: SpinRecord = {
          id: `${Date.now()}`,
          vendedor: selectedVendedor,
          motivo: selectedMotivo,
          motivoTitulo: motive.titulo,
          premio: prize.label,
          data: now.toLocaleDateString('pt-BR'),
          hora: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          status: 'pendente',
        };
        const updated = [record, ...spins].slice(0, 50);
        setSpins(updated);
        saveSpins(updated);

        // Save limit
        const limits = loadLimits();
        limits[`${selectedVendedor}_${selectedMotivo}`] = now.toISOString();
        saveLimits(limits);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [selectedVendedor, selectedMotivo, wheelAngle, spins, validateSpin]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const recentSpins = spins.slice(0, 10);

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

          {/* Prizes info */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Prêmios Possíveis</h3>
            <div className="space-y-1.5">
              {PRIZES.map(p => (
                <div key={p.label} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-secondary/50 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                    <span className="text-foreground">{p.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{p.peso}%</span>
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

          {/* History */}
          <div className="glass-card p-5">
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
          </div>
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

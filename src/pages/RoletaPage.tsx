import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useSalesData } from '@/contexts/SalesDataContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trophy, Gift, Zap, Target, TrendingUp, Crown, History } from 'lucide-react';

const fmtFull = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

interface TierConfig {
  id: string;
  titulo: string;
  descricao: string;
  frequencia: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  premios: { valor: number; peso: number }[];
}

interface SpinRecord {
  id: string;
  vendedor: string;
  tier: string;
  tierTitulo: string;
  premio: number;
  data: string;
  hora: string;
  status: 'pendente' | 'pago';
}

const TIERS: TierConfig[] = [
  {
    id: 'volume_diario',
    titulo: 'Volume Diário',
    descricao: '3+ vendas em um dia',
    frequencia: '1x por dia',
    icon: <Zap className="w-5 h-5" />,
    color: '#00BCD4',
    bgColor: 'rgba(0, 188, 212, 0.15)',
    premios: [
      { valor: 50, peso: 30 },
      { valor: 75, peso: 25 },
      { valor: 100, peso: 25 },
      { valor: 150, peso: 20 },
    ],
  },
  {
    id: 'ticket_elevado',
    titulo: 'Ticket Elevado',
    descricao: '1+ venda acima de R$ 400',
    frequencia: '1x a cada 2 dias',
    icon: <TrendingUp className="w-5 h-5" />,
    color: '#4CAF50',
    bgColor: 'rgba(76, 175, 80, 0.15)',
    premios: [
      { valor: 150, peso: 20 },
      { valor: 200, peso: 25 },
      { valor: 250, peso: 30 },
      { valor: 300, peso: 25 },
    ],
  },
  {
    id: 'meta_semanal',
    titulo: 'Meta Semanal',
    descricao: '50% da meta semanal atingida',
    frequencia: '1x por semana',
    icon: <Target className="w-5 h-5" />,
    color: '#FF9800',
    bgColor: 'rgba(255, 152, 0, 0.15)',
    premios: [
      { valor: 300, peso: 30 },
      { valor: 500, peso: 25 },
      { valor: 750, peso: 25 },
      { valor: 1000, peso: 20 },
    ],
  },
  {
    id: 'conversao_alta',
    titulo: 'Conversão Alta',
    descricao: 'Taxa de conversão acima de 25%',
    frequencia: '1x por semana',
    icon: <Trophy className="w-5 h-5" />,
    color: '#9C27B0',
    bgColor: 'rgba(156, 39, 176, 0.15)',
    premios: [
      { valor: 250, peso: 25 },
      { valor: 400, peso: 25 },
      { valor: 600, peso: 30 },
      { valor: 1000, peso: 20 },
    ],
  },
  {
    id: 'combo_semanal',
    titulo: 'Combo Semanal',
    descricao: '3+ objetivos na mesma semana',
    frequencia: '1x por semana',
    icon: <Crown className="w-5 h-5" />,
    color: '#FFD700',
    bgColor: 'rgba(255, 215, 0, 0.15)',
    premios: [
      { valor: 500, peso: 25 },
      { valor: 750, peso: 25 },
      { valor: 1000, peso: 30 },
      { valor: 1500, peso: 20 },
    ],
  },
];

const STORAGE_KEY_SPINS = 'roleta_historico';
const STORAGE_KEY_LIMITS = 'roleta_limites';

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

function weightedRandom(premios: { valor: number; peso: number }[]): number {
  const totalWeight = premios.reduce((s, p) => s + p.peso, 0);
  let r = Math.random() * totalWeight;
  for (const p of premios) {
    r -= p.peso;
    if (r <= 0) return p.valor;
  }
  return premios[premios.length - 1].valor;
}

export default function RoletaPage() {
  const { vendedores, clientes, vendedorStats } = useSalesData();
  const [selectedVendedor, setSelectedVendedor] = useState('');
  const [selectedTier, setSelectedTier] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ premio: number; tier: TierConfig } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [spins, setSpins] = useState<SpinRecord[]>(loadSpins);
  const [rotation, setRotation] = useState(0);
  const [validationError, setValidationError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentTier = useMemo(() => TIERS.find(t => t.id === selectedTier), [selectedTier]);

  // Draw wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentTier) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;
    const segments = currentTier.premios.length;
    const anglePerSegment = (Math.PI * 2) / segments;

    ctx.clearRect(0, 0, size, size);

    currentTier.premios.forEach((p, i) => {
      const startAngle = i * anglePerSegment + (rotation * Math.PI / 180);
      const endAngle = startAngle + anglePerSegment;

      // Segment
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      const lightness = 25 + (i * 12);
      ctx.fillStyle = `hsl(${parseInt(currentTier.color.slice(1), 16) % 360}, 60%, ${lightness}%)`;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + anglePerSegment / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px system-ui';
      ctx.fillText(`R$ ${p.valor}`, radius * 0.6, 5);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(center, center, 25, 0, Math.PI * 2);
    ctx.fillStyle = currentTier.color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Pointer (top)
    ctx.beginPath();
    ctx.moveTo(center - 12, 5);
    ctx.lineTo(center + 12, 5);
    ctx.lineTo(center, 30);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.fill();
  }, [currentTier, rotation]);

  const validateSpin = useCallback((): string | null => {
    if (!selectedVendedor) return 'Selecione um vendedor';
    if (!selectedTier) return 'Selecione um motivo';

    const vendedor = vendedores.find(v => v.nome === selectedVendedor);
    if (!vendedor) return 'Vendedor não encontrado';

    const today = new Date().toLocaleDateString('pt-BR');
    const limits = loadLimits();
    const limitKey = `${selectedVendedor}_${selectedTier}`;
    const lastSpin = limits[limitKey];

    if (lastSpin) {
      const lastDate = new Date(lastSpin);
      const now = new Date();
      const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);

      if (selectedTier === 'volume_diario' && diffHours < 24) {
        return `Próxima girada disponível em ${Math.ceil(24 - diffHours)}h`;
      }
      if (selectedTier === 'ticket_elevado' && diffHours < 48) {
        return `Próxima girada disponível em ${Math.ceil(48 - diffHours)}h`;
      }
      if (['meta_semanal', 'conversao_alta', 'combo_semanal'].includes(selectedTier) && diffHours < 168) {
        return `Próxima girada disponível em ${Math.ceil(168 - diffHours)}h`;
      }
    }

    // Validate actual achievement
    const vendorClientes = clientes.filter(c => c.vendedor === selectedVendedor);
    const todayClientes = vendorClientes.filter(c => c.data === today);

    if (selectedTier === 'volume_diario' && todayClientes.length < 3) {
      return `Você tem ${todayClientes.length} vendas hoje. Precisa de 3+ para girar. 💪`;
    }

    if (selectedTier === 'ticket_elevado') {
      const hasHighTicket = todayClientes.some(c => c.entrada >= 400);
      if (!hasHighTicket) return 'Nenhuma venda acima de R$ 400 hoje. Continue tentando! 💪';
    }

    if (selectedTier === 'meta_semanal') {
      const stat = vendedorStats.find(s => s.vendedor.nome === selectedVendedor);
      const weeklyTarget = (stat?.vendedor.meta || 0) / 4;
      const weekFat = stat?.faturamento || 0;
      if (weekFat < weeklyTarget * 0.5) {
        return `Faturamento: ${fmtFull(weekFat)} / Meta semanal 50%: ${fmtFull(weeklyTarget * 0.5)}. Continue! 💪`;
      }
    }

    if (selectedTier === 'conversao_alta') {
      if (vendorClientes.length < 3) return 'Precisa de pelo menos 3 vendas para calcular conversão.';
    }

    return null;
  }, [selectedVendedor, selectedTier, vendedores, clientes, vendedorStats]);

  const handleSpin = useCallback(() => {
    const error = validateSpin();
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError('');

    const tier = TIERS.find(t => t.id === selectedTier)!;
    const premio = weightedRandom(tier.premios);

    setSpinning(true);
    
    // Animate rotation
    const targetRotation = rotation + 1440 + Math.random() * 360;
    setRotation(targetRotation);

    setTimeout(() => {
      setSpinning(false);
      setResult({ premio, tier });
      setShowResult(true);

      // Save spin record
      const now = new Date();
      const record: SpinRecord = {
        id: `${Date.now()}`,
        vendedor: selectedVendedor,
        tier: selectedTier,
        tierTitulo: tier.titulo,
        premio,
        data: now.toLocaleDateString('pt-BR'),
        hora: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        status: 'pendente',
      };
      const updated = [record, ...spins].slice(0, 50);
      setSpins(updated);
      saveSpins(updated);

      // Save limit
      const limits = loadLimits();
      limits[`${selectedVendedor}_${selectedTier}`] = now.toISOString();
      saveLimits(limits);
    }, 3000);
  }, [selectedVendedor, selectedTier, rotation, spins, validateSpin]);

  const saldoVendedor = useMemo(() => {
    if (!selectedVendedor) return 0;
    return spins
      .filter(s => s.vendedor === selectedVendedor)
      .reduce((s, r) => s + r.premio, 0);
  }, [spins, selectedVendedor]);

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
        {/* Left: Controls + Wheel */}
        <div className="space-y-4">
          {/* Selectors */}
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
              <Select value={selectedTier} onValueChange={v => { setSelectedTier(v); setValidationError(''); }}>
                <SelectTrigger className="bg-secondary border-border/50">
                  <SelectValue placeholder="Selecione o tier..." />
                </SelectTrigger>
                <SelectContent>
                  {TIERS.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <span>{t.titulo}</span>
                        <span className="text-xs text-muted-foreground">({t.descricao})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedVendedor && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Trophy className="w-4 h-4 text-kpi-goal-pct" />
                Saldo acumulado: <span className="text-foreground font-semibold">{fmtFull(saldoVendedor)}</span>
              </div>
            )}

            {validationError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                {validationError}
              </div>
            )}

            <Button
              onClick={handleSpin}
              disabled={spinning || !selectedVendedor || !selectedTier}
              className="w-full h-12 text-lg font-bold"
              style={{ background: currentTier?.color || undefined }}
            >
              {spinning ? '🎡 Girando...' : '🎰 GIRAR A ROLETA'}
            </Button>
          </div>

          {/* Tiers info */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Tiers de Prêmios</h3>
            <div className="space-y-2">
              {TIERS.map(t => (
                <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: t.bgColor }}>
                  <div className="shrink-0" style={{ color: t.color }}>{t.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{t.titulo}</p>
                    <p className="text-xs text-muted-foreground">{t.descricao} • {t.frequencia}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {fmtFull(t.premios[0].valor)} – {fmtFull(t.premios[t.premios.length - 1].valor)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Wheel + History */}
        <div className="space-y-4">
          {/* Wheel */}
          <div className="glass-card p-5 flex flex-col items-center">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              {currentTier ? `🎡 ${currentTier.titulo}` : '🎡 Selecione um tier para ver a roleta'}
            </h3>
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={300}
                height={300}
                className="transition-transform duration-[3000ms] ease-out"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
              {!currentTier && (
                <div className="absolute inset-0 flex items-center justify-center bg-secondary/80 rounded-full">
                  <p className="text-muted-foreground text-sm text-center px-8">Selecione um vendedor e tier para começar</p>
                </div>
              )}
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
                  const tier = TIERS.find(t => t.id === s.tier);
                  return (
                    <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/50 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{s.vendedor}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: tier?.bgColor, color: tier?.color }}>
                          {s.tierTitulo}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-foreground">{fmtFull(s.premio)}</span>
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
              <div className="text-5xl font-bold" style={{ color: result.tier.color }}>
                {fmtFull(result.premio)}
              </div>
              <p className="text-muted-foreground">
                Motivo: <span className="text-foreground font-medium">{result.tier.titulo}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {result.premio >= 500 ? 'UAUUU! Merecido! 🤑' : 'Que legal! Continue assim! ⚡'}
              </p>
              <div className="flex gap-3 justify-center pt-2">
                <Button onClick={() => setShowResult(false)}>
                  Voltar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

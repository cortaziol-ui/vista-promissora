import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email, password)) {
      navigate('/');
    } else {
      toast({ title: 'Erro', description: 'Email não encontrado. Tente: carlos@empresa.com, ana@empresa.com, rafael@empresa.com', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary mx-auto mb-4 flex items-center justify-center text-primary-foreground font-bold text-2xl">
            BI
          </div>
          <h1 className="text-2xl font-bold text-foreground">Performance Dashboard</h1>
          <p className="text-muted-foreground mt-2">Entre para acessar seu painel</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-secondary border-border/50"
                placeholder="seu@email.com"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-secondary border-border/50"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full">Entrar</Button>
        </form>

        <div className="mt-6 glass-card p-4">
          <p className="text-xs text-muted-foreground mb-2">Logins de teste:</p>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p><span className="text-kpi-revenue">Admin:</span> carlos@empresa.com</p>
            <p><span className="text-kpi-goal">Gerente:</span> ana@empresa.com</p>
            <p><span className="text-kpi-ticket">Vendedor:</span> rafael@empresa.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}

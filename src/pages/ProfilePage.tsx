import { useAuth } from '@/contexts/AuthContext';
import { useSalesData } from '@/contexts/SalesDataContext';
import { CommissionSummary } from '@/components/CommissionSummary';
import { CommissionProgress } from '@/components/CommissionProgress';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { vendedorStats, selectedMonth } = useSalesData();
  const navigate = useNavigate();

  if (!user) return null;

  const roleLabel = user.role === 'admin' ? 'Administrador' : user.role === 'manager' ? 'Gerente' : 'Vendedor';

  // Find this user's vendor stats (by sellerName or email prefix)
  const myStats = vendedorStats.find(s =>
    s.vendedor.nome === user.sellerName ||
    s.vendedor.nome.toLowerCase() === user.name.toLowerCase()
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>

      <div className="glass-card p-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-4xl overflow-hidden">
            {user.avatar.startsWith('/') ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" /> : user.avatar}
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{user.name}</h2>
            <p className="text-muted-foreground">{user.position}</p>
            <span className="inline-block mt-2 text-xs px-3 py-1 rounded-full bg-primary/20 text-primary font-medium">{roleLabel}</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm text-foreground">{user.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="text-sm text-foreground capitalize">{user.status === 'active' ? 'Ativo' : 'Inativo'}</p>
          </div>
          {myStats && (
            <>
              <div>
                <p className="text-xs text-muted-foreground">Vendas no mês</p>
                <p className="text-sm text-foreground font-semibold">{myStats.vendas} / {myStats.vendedor.meta}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Faturamento</p>
                <p className="text-sm text-foreground">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(myStats.faturamento)}</p>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-border/50">
          <Button variant="destructive" onClick={() => { logout(); navigate('/login'); }}>
            Sair da conta
          </Button>
        </div>
      </div>

      {/* Commission section for this user */}
      {myStats && (
        <>
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Progresso de Premiação</h2>
            <CommissionProgress
              vendedorNome={myStats.vendedor.nome}
              vendas={myStats.vendas}
              meta={myStats.vendedor.meta}
              month={selectedMonth}
            />
          </div>
          <CommissionSummary
            vendedorNome={myStats.vendedor.nome}
            vendas={myStats.vendas}
            meta={myStats.vendedor.meta}
            month={selectedMonth}
          />
        </>
      )}
    </div>
  );
}

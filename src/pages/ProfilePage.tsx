import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const roleLabel = user.role === 'admin' ? 'Administrador' : user.role === 'manager' ? 'Gerente' : 'Vendedor';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>

      <div className="glass-card p-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-4xl">{user.avatar}</div>
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
          {user.role === 'seller' && (
            <>
              <div>
                <p className="text-xs text-muted-foreground">Cargo</p>
                <p className="text-sm text-foreground">{user.position}</p>
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
    </div>
  );
}

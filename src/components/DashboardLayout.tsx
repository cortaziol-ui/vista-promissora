import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { Layers } from 'lucide-react';

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { accounts, activeAccountId } = useTenant();
  const isConsolidatedSeller = user?.role === 'seller' && accounts.length > 1 && !activeAccountId;
  const consolidatedLabel = isConsolidatedSeller ? accounts.map(a => a.name).join(' + ') : '';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border/50 px-4 backdrop-blur-md bg-background/80 sticky top-0 z-30">
            <SidebarTrigger className="mr-4 text-muted-foreground hover:text-foreground transition-colors" />
            {isConsolidatedSeller && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">Visão consolidada — {consolidatedLabel}</span>
              </div>
            )}
            <div className="flex items-center gap-3 ml-auto">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.position}</p>
              </div>
              {user?.avatar?.startsWith('/') ? (
                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm">{user?.avatar}</div>
              )}
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

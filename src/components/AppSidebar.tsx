import { useState, useEffect } from 'react';
import {
  BarChart3, Home, Megaphone, SmilePlus, DollarSign, Settings, LogOut, User, ClipboardList, Gift, Sun, Moon, FileText, FolderOpen, ChevronRight, Building2, ChevronDown, LayoutDashboard,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
  SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton,
} from '@/components/ui/sidebar';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

const allNavItems: NavItem[] = [
  { title: 'Visão Geral', url: '/', icon: Home, roles: ['admin', 'manager', 'financeiro'] },
  { title: 'Vendas', url: '/vendas', icon: BarChart3, roles: ['admin', 'manager', 'seller', 'administrativo', 'financeiro'] },
  { title: 'Marketing', url: '/marketing', icon: Megaphone, roles: ['admin', 'manager', 'financeiro'] },
  { title: 'Satisfação', url: '/satisfacao', icon: SmilePlus, roles: ['admin', 'manager', 'administrativo', 'financeiro'] },
  { title: 'Financeiro', url: '/financeiro', icon: DollarSign, roles: ['admin', 'financeiro'] },
  { title: 'Planilha de Controle', url: '/planilha', icon: ClipboardList, roles: ['admin', 'manager', 'administrativo', 'financeiro'] },
  { title: 'Roleta Premiada', url: '/roleta', icon: Gift, roles: ['admin', 'manager', 'seller', 'financeiro'] },
  { title: 'Fichas Rating', url: '/fichas', icon: FileText, roles: ['admin', 'manager', 'financeiro'] },
];

const adminItems: NavItem[] = [
  { title: 'Configurações', url: '/configuracoes', icon: Settings, roles: ['admin'] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { user, logout } = useAuth();
  const { accounts, activeAccount, isMultiTenant, switchAccount, enterOverviewMode } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();

  const userRole = user?.role || 'seller';
  const isOnPainel = location.pathname === '/painel';

  const visibleNavItems = allNavItems.filter(item => item.roles.includes(userRole));
  const visibleAdminItems = adminItems.filter(item => item.roles.includes(userRole));

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('app-theme') as 'dark' | 'light') || 'dark';
  });

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSwitchAccount = (accountId: string) => {
    switchAccount(accountId);
    setAccountMenuOpen(false);
    // Se está no painel de controle, navegar para visão geral da subconta
    if (location.pathname === '/painel') {
      navigate('/');
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex justify-center">
          <img src="/logo-outcom.png" alt="out.com" className={collapsed ? "w-8 shrink-0 rounded-lg" : "w-28 shrink-0 rounded-xl"} />
        </div>

        {/* Account Switcher — visible for multi-tenant users with admin, manager, administrativo roles */}
        {isMultiTenant && !collapsed && ['admin', 'manager', 'administrativo'].includes(userRole) && (
          <div className="px-3 mb-2">
            <div className="relative">
              <button
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                className="w-full flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/50 px-3 py-2 text-left hover:bg-secondary transition-colors"
              >
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{isOnPainel ? 'Modo' : 'Subconta'}</p>
                  <p className="text-sm font-medium truncate">{isOnPainel ? 'Painel de Controle' : (activeAccount?.name || 'Selecionar')}</p>
                </div>
                <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {accountMenuOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border bg-popover shadow-lg z-50">
                  {/* Painel de Controle link */}
                  {userRole === 'admin' && (
                    <button
                      onClick={() => {
                        setAccountMenuOpen(false);
                        enterOverviewMode();
                        navigate('/painel');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors rounded-t-lg border-b border-border/50"
                    >
                      <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium text-primary">Painel de Controle</span>
                    </button>
                  )}
                  {accounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => handleSwitchAccount(account.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors last:rounded-b-lg ${
                        account.id === activeAccount?.id ? 'bg-accent/50 font-medium' : ''
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${account.id === activeAccount?.id ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                      <span className="truncate">{account.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Painel de Controle — visible for admins with multi-tenant even when collapsed */}
        {isMultiTenant && collapsed && userRole === 'admin' && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/painel" end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-primary font-medium">
                      <LayoutDashboard className="mr-2 h-4 w-4 shrink-0" />
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Módulos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isOnPainel ? (
                /* Overview mode: só Visão Geral apontando para /painel */
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/painel" end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-primary font-medium">
                      <Home className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>Visão Geral</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                <>
                  {visibleNavItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} end={item.url === '/'} className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-primary font-medium">
                          <item.icon className="mr-2 h-4 w-4 shrink-0" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}

                  {/* Documentos — submenu colapsável */}
                  {['admin', 'manager', 'administrativo', 'financeiro'].includes(userRole) && (
                    <Collapsible defaultOpen={location.pathname.startsWith('/documentos')} className="group/collapsible">
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip="Documentos" className="hover:bg-sidebar-accent/50">
                            <FolderOpen className="mr-2 h-4 w-4 shrink-0" />
                            {!collapsed && (
                              <>
                                <span className="flex-1">Documentos</span>
                                <ChevronRight className="ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                              </>
                            )}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild>
                                <NavLink to="/documentos/rating" end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-primary font-medium">
                                  Rating
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild>
                                <NavLink to="/documentos" end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-primary font-medium">
                                  Limpa Nome
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  )}
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleAdminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-primary font-medium">
                        <item.icon className="mr-2 h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          {/* Theme toggle */}
          <SidebarMenuItem>
            <div className="flex gap-1 px-2 py-1">
              <button
                onClick={() => setTheme('light')}
                className={`flex items-center gap-2 flex-1 rounded-md px-2 py-1.5 text-sm transition-colors ${theme === 'light' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-sidebar-accent/50'}`}
              >
                <Sun className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Claro</span>}
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-2 flex-1 rounded-md px-2 py-1.5 text-sm transition-colors ${theme === 'dark' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-sidebar-accent/50'}`}
              >
                <Moon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Escuro</span>}
              </button>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/perfil" className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-primary font-medium">
                <User className="mr-2 h-4 w-4 shrink-0" />
                {!collapsed && <span>Perfil</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="hover:bg-destructive/20 text-muted-foreground hover:text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4 shrink-0" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

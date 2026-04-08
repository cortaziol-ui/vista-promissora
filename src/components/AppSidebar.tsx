import { useState, useEffect } from 'react';
import {
  BarChart3, Home, Megaphone, SmilePlus, DollarSign, Settings, LogOut, User, ClipboardList, Gift, Sun, Moon, FileText,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
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
  const navigate = useNavigate();

  const userRole = user?.role || 'seller';

  const visibleNavItems = allNavItems.filter(item => item.roles.includes(userRole));
  const visibleAdminItems = adminItems.filter(item => item.roles.includes(userRole));

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('app-theme') as 'dark' | 'light') || 'dark';
  });

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

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex justify-center">
          <img src="/logo-outcom.png" alt="out.com" className={collapsed ? "w-8 shrink-0 rounded-lg" : "w-28 shrink-0 rounded-xl"} />
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Módulos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
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

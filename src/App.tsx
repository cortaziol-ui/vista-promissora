import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SalesDataProvider } from "@/contexts/SalesDataContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import LoginPage from "./pages/LoginPage";
import OverviewPage from "./pages/OverviewPage";
import SalesPage from "./pages/SalesPage";
import MarketingPage from "./pages/MarketingPage";
import SatisfactionPage from "./pages/SatisfactionPage";
import FinancialPage from "./pages/FinancialPage";
import PlanilhaPage from "./pages/PlanilhaPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import RoletaPage from "./pages/RoletaPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Crash detected:", error, info);
    setTimeout(() => window.location.reload(), 500);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold">Recuperando dados…</p>
            <p className="text-sm text-muted-foreground">A página será recarregada automaticamente.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

type AllowedRole = 'admin' | 'manager' | 'seller';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: AllowedRole[] }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    const defaultRoute = user.role === 'seller' ? '/vendas' : '/';
    return <Navigate to={defaultRoute} replace />;
  }
  return <DashboardLayout>{children}</DashboardLayout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const defaultRoute = user?.role === 'seller' ? '/vendas' : '/';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={defaultRoute} replace /> : <LoginPage />} />
      
      {/* Admin + Manager only */}
      <Route path="/" element={<ProtectedRoute roles={['admin', 'manager']}><OverviewPage /></ProtectedRoute>} />
      <Route path="/marketing" element={<ProtectedRoute roles={['admin', 'manager']}><MarketingPage /></ProtectedRoute>} />
      <Route path="/satisfacao" element={<ProtectedRoute roles={['admin', 'manager']}><SatisfactionPage /></ProtectedRoute>} />
      <Route path="/planilha" element={<ProtectedRoute roles={['admin', 'manager']}><PlanilhaPage /></ProtectedRoute>} />
      
      {/* Admin only */}
      <Route path="/financeiro" element={<ProtectedRoute roles={['admin']}><FinancialPage /></ProtectedRoute>} />
      <Route path="/configuracoes" element={<ProtectedRoute roles={['admin']}><SettingsPage /></ProtectedRoute>} />
      
      {/* All roles */}
      <Route path="/vendas" element={<ProtectedRoute roles={['admin', 'manager', 'seller']}><SalesPage /></ProtectedRoute>} />
      <Route path="/roleta" element={<ProtectedRoute roles={['admin', 'manager', 'seller']}><RoletaPage /></ProtectedRoute>} />
      <Route path="/perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <SalesDataProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </SalesDataProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

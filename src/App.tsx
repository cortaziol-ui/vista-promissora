import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SalesDataProvider } from "@/contexts/SalesDataContext";
import { AccountProvider } from "@/contexts/AccountContext";
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
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: `${error.name}: ${error.message}` };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Crash detected:", error, info);
  }

  componentDidMount() {
    sessionStorage.removeItem('crashAttempts');
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center space-y-3 max-w-md px-4">
            <p className="text-lg font-semibold">Algo deu errado</p>
            <p className="text-xs text-muted-foreground font-mono bg-secondary/50 p-3 rounded-lg text-left break-all">
              {this.state.errorMessage}
            </p>
            <p className="text-sm text-muted-foreground">Tire um print desta tela e envie para o suporte.</p>
            <button
              className="mt-3 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm"
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                window.location.reload();
              }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
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
    const hasOverview = ['admin', 'manager', 'financeiro'].includes(user.role);
    return <Navigate to={hasOverview ? '/' : '/vendas'} replace />;
  }
  return <DashboardLayout>{children}</DashboardLayout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const hasOverview = user && ['admin', 'manager', 'financeiro'].includes(user.role);
  const defaultRoute = hasOverview ? '/' : '/vendas';

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

      <Route path="/" element={<ProtectedRoute roles={['admin', 'manager', 'financeiro']}><OverviewPage /></ProtectedRoute>} />
      <Route path="/marketing" element={<ProtectedRoute roles={['admin', 'manager', 'financeiro']}><MarketingPage /></ProtectedRoute>} />
      <Route path="/satisfacao" element={<ProtectedRoute roles={['admin', 'manager', 'administrativo', 'financeiro']}><SatisfactionPage /></ProtectedRoute>} />
      <Route path="/planilha" element={<ProtectedRoute roles={['admin', 'manager', 'administrativo', 'financeiro']}><PlanilhaPage /></ProtectedRoute>} />
      <Route path="/financeiro" element={<ProtectedRoute roles={['admin', 'financeiro']}><FinancialPage /></ProtectedRoute>} />
      <Route path="/configuracoes" element={<ProtectedRoute roles={['admin']}><SettingsPage /></ProtectedRoute>} />
      <Route path="/vendas" element={<ProtectedRoute roles={['admin', 'manager', 'seller', 'administrativo', 'financeiro']}><SalesPage /></ProtectedRoute>} />
      <Route path="/roleta" element={<ProtectedRoute roles={['admin', 'manager', 'seller', 'financeiro']}><RoletaPage /></ProtectedRoute>} />
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
          <AccountProvider>
            <SalesDataProvider>
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </SalesDataProvider>
          </AccountProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

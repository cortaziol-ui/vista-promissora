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
    console.error("[ErrorBoundary] Crash detected, auto-resetting data:", error, info);
    // Clear all salesData keys to recover from corrupted state
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('salesData')) localStorage.removeItem(key);
      });
    } catch { /* ignore */ }
    // Reload after a brief delay so the user sees a flash, not a white screen
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <DashboardLayout>{children}</DashboardLayout>;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><OverviewPage /></ProtectedRoute>} />
      <Route path="/vendas" element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
      <Route path="/marketing" element={<ProtectedRoute><MarketingPage /></ProtectedRoute>} />
      <Route path="/satisfacao" element={<ProtectedRoute><SatisfactionPage /></ProtectedRoute>} />
      <Route path="/financeiro" element={<ProtectedRoute><FinancialPage /></ProtectedRoute>} />
      <Route path="/planilha" element={<ProtectedRoute><PlanilhaPage /></ProtectedRoute>} />
      <Route path="/perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/configuracoes" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
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

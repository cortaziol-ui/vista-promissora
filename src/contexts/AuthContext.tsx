import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export type UserRole = "admin" | "manager" | "seller" | "administrativo" | "financeiro";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  position: string;
  status: "active" | "inactive";
  sellerName?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  isManager: boolean;
  isSeller: boolean;
  isAdministrativo: boolean;
  isFinanceiro: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const POSITION_MAP: Record<UserRole, string> = {
  admin: "Administrador",
  manager: "Gerente / Vendedor",
  seller: "Vendedor(a)",
  administrativo: "Administrativo",
  financeiro: "Financeiro",
};

function buildUser(supaUser: SupabaseUser, role: UserRole, sellerName?: string): User {
  const email = supaUser.email || "";
  const name = email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1);
  return {
    id: supaUser.id,
    name,
    email,
    role,
    avatar: role === "admin" ? "/foto-caio.jpg" : role === "financeiro" ? "💰" : role === "administrativo" ? "📂" : "👨",
    position: POSITION_MAP[role],
    status: "active",
    sellerName,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch role + seller name and update user in background (non-blocking)
  const enrichUser = useCallback(async (supaUser: SupabaseUser) => {
    try {
      const [roleRes, sellerRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", supaUser.id).limit(1).maybeSingle(),
        supabase.from("vendedores").select("nome").eq("user_id", supaUser.id).limit(1).maybeSingle(),
      ]);
      const role = (roleRes.data?.role as UserRole) || "seller";
      const sellerName = sellerRes.data?.nome || undefined;
      setUser(buildUser(supaUser, role, sellerName));
    } catch (e) {
      console.error("[AuthContext] enrichUser error:", e);
      // Keep whatever user we already have set
    }
  }, []);

  useEffect(() => {
    // Safety timeout
    const timeout = setTimeout(() => setLoading(false), 6000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      clearTimeout(timeout);

      if (session?.user) {
        // If we already resolved this user, just unblock
        if (user?.id === session.user.id) {
          setLoading(false);
          return;
        }
        // Fetch role before unblocking UI to avoid flickering
        enrichUser(session.user).finally(() => setLoading(false));
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [enrichUser]);

  const login = async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAdmin: user?.role === "admin",
        isManager: user?.role === "manager",
        isSeller: user?.role === "seller",
        isAdministrativo: user?.role === "administrativo",
        isFinanceiro: user?.role === "financeiro",
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

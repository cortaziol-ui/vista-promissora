import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export type UserRole = "admin" | "manager" | "seller";

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
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchUserRole(userId: string): Promise<UserRole> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).limit(1).maybeSingle();
  return (data?.role as UserRole) || "seller";
}

async function fetchSellerName(userId: string): Promise<string | undefined> {
  const { data } = await supabase.from("vendedores").select("nome").eq("user_id", userId).limit(1).maybeSingle();
  return data?.nome || undefined;
}

function buildUser(supaUser: SupabaseUser, role: UserRole, sellerName?: string): User {
  const email = supaUser.email || "";
  const name = email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1);

  const positionMap: Record<UserRole, string> = {
    admin: "Administrador",
    manager: "Gerente / Vendedor",
    seller: "Vendedor(a)",
  };

  return {
    id: supaUser.id,
    name,
    email,
    role,
    avatar: role === "admin" ? "👤" : "👨",
    position: positionMap[role],
    status: "active",
    sellerName,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety timeout — if Supabase doesn't respond in 5s, unblock the UI
    const timeout = setTimeout(() => {
      console.warn("[AuthContext] Timeout reached — unblocking UI");
      setLoading(false);
    }, 5000);

    // Also check the current session immediately
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          const role = await fetchUserRole(session.user.id);
          const sellerName = await fetchSellerName(session.user.id);
          setUser(buildUser(session.user, role, sellerName));
        } catch (e) {
          console.error("Error fetching user data:", e);
          setUser(buildUser(session.user, "seller"));
        }
      } else {
        setUser(null);
      }
      clearTimeout(timeout);
      setLoading(false);
    }).catch(() => {
      clearTimeout(timeout);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          const role = await fetchUserRole(session.user.id);
          const sellerName = await fetchSellerName(session.user.id);
          setUser(buildUser(session.user, role, sellerName));
        } catch (e) {
          console.error("Error fetching user data:", e);
          setUser(buildUser(session.user, "seller"));
        }
      } else {
        setUser(null);
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) return false;
      // Build user immediately so navigation doesn't hit a null user
      try {
        const role = await fetchUserRole(data.user.id);
        const sellerName = await fetchSellerName(data.user.id);
        setUser(buildUser(data.user, role, sellerName));
      } catch {
        setUser(buildUser(data.user, "seller"));
      }
      return true;
    } catch {
      return false;
    }
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

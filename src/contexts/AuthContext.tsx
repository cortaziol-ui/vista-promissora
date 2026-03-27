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
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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

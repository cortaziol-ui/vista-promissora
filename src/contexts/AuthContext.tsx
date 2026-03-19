import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'admin' | 'manager' | 'seller';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  position: string;
  status: 'active' | 'inactive';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isAdmin: boolean;
  isManager: boolean;
  isSeller: boolean;
}

const appUsers: User[] = [
  { id: 'u1', name: 'Carlos Mendes', email: 'carlos@empresa.com', role: 'admin', avatar: '👤', position: 'Diretor Comercial', status: 'active' },
  { id: 'u2', name: 'Ana Souza', email: 'ana@empresa.com', role: 'manager', avatar: '👤', position: 'Gerente de Vendas', status: 'active' },
  { id: 'u3', name: 'Bianca', email: 'bianca@empresa.com', role: 'seller', avatar: '👩', position: 'Vendedora', status: 'active' },
  { id: 'u4', name: 'Nayra', email: 'nayra@empresa.com', role: 'seller', avatar: '👩', position: 'Vendedora', status: 'active' },
  { id: 'u5', name: 'Lucas', email: 'lucas@empresa.com', role: 'seller', avatar: '👨', position: 'Vendedor', status: 'active' },
  { id: 'u6', name: 'Gustavo', email: 'gustavo@empresa.com', role: 'seller', avatar: '👨', position: 'Vendedor', status: 'active' },
  { id: 'u7', name: 'Cunha', email: 'cunha@empresa.com', role: 'seller', avatar: '👨', position: 'Vendedor Sênior', status: 'active' },
];

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('bi-user');
    if (saved) {
      const parsed = JSON.parse(saved);
      return appUsers.find(u => u.id === parsed.id) || null;
    }
    return null;
  });

  const login = (email: string, _password: string) => {
    const found = appUsers.find(u => u.email === email);
    if (found) {
      setUser(found);
      localStorage.setItem('bi-user', JSON.stringify({ id: found.id }));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('bi-user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAdmin: user?.role === 'admin',
      isManager: user?.role === 'manager',
      isSeller: user?.role === 'seller',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

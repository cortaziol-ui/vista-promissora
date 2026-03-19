import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, users } from '@/data/mockData';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isAdmin: boolean;
  isManager: boolean;
  isSeller: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('bi-user');
    if (saved) {
      const parsed = JSON.parse(saved);
      return users.find(u => u.id === parsed.id) || null;
    }
    return null;
  });

  const login = (email: string, _password: string) => {
    const found = users.find(u => u.email === email);
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

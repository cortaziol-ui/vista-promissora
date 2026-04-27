import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Account {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface UserAccount {
  account_id: string;
  role: string;
  is_default: boolean;
  account: Account;
}

interface TenantContextValue {
  accounts: Account[];
  activeAccountId: string | null;
  activeAccount: Account | null;
  isOverviewMode: boolean;
  isMultiTenant: boolean;
  switchAccount: (id: string) => void;
  enterOverviewMode: () => void;
  loading: boolean;
}

const TenantContext = createContext<TenantContextValue>({
  accounts: [],
  activeAccountId: null,
  activeAccount: null,
  isOverviewMode: false,
  isMultiTenant: false,
  switchAccount: () => {},
  enterOverviewMode: () => {},
  loading: true,
});

const STORAGE_KEY = 'outcom_active_account_id';

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );
  const [loading, setLoading] = useState(true);

  const loadAccounts = useCallback(async () => {
    if (!user) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_accounts')
        .select('account_id, role, is_default, account:accounts(id, name, slug, logo_url)')
        .eq('user_id', user.id);

      if (error) {
        console.error('[TenantContext] Error loading accounts:', error);
        setLoading(false);
        return;
      }

      const userAccounts = (data || []) as unknown as UserAccount[];
      const accts = userAccounts.map(ua => ua.account);
      setAccounts(accts);

      // Seller with multiple accounts → consolidated view (no active account selected).
      if (user.role === 'seller' && accts.length > 1) {
        setActiveAccountId(null);
        localStorage.removeItem(STORAGE_KEY);
      } else if (!activeAccountId || !accts.find(a => a.id === activeAccountId)) {
        // Otherwise, pick the default or first
        const defaultAcct = userAccounts.find(ua => ua.is_default);
        const firstId = defaultAcct ? defaultAcct.account_id : accts[0]?.id || null;
        setActiveAccountId(firstId);
        if (firstId) localStorage.setItem(STORAGE_KEY, firstId);
      }
    } catch (e) {
      console.error('[TenantContext] Error:', e);
    } finally {
      setLoading(false);
    }
  }, [user, activeAccountId]);

  useEffect(() => {
    loadAccounts();
  }, [user?.id]);

  const switchAccount = useCallback((id: string) => {
    setActiveAccountId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const enterOverviewMode = useCallback(() => {
    setActiveAccountId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const activeAccount = accounts.find(a => a.id === activeAccountId) || null;
  const isOverviewMode = activeAccountId === null && accounts.length > 1;
  const isMultiTenant = accounts.length > 1;

  return (
    <TenantContext.Provider value={{
      accounts,
      activeAccountId,
      activeAccount,
      isOverviewMode,
      isMultiTenant,
      switchAccount,
      enterOverviewMode,
      loading,
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

export interface MetaAccount {
  id: string;
  name: string;
  access_token: string;
  ad_account_id: string;
  is_active: boolean;
  created_at: string;
}

interface AccountContextValue {
  accounts: MetaAccount[];
  activeAccount: MetaAccount | null;
  loading: boolean;
  switchAccount: (id: string) => Promise<void>;
  addAccount: (name: string, adAccountId: string) => Promise<MetaAccount>;
  updateAccountName: (id: string, name: string) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

const AccountContext = createContext<AccountContextValue>({
  accounts: [], activeAccount: null, loading: true,
  switchAccount: async () => {},
  addAccount: async () => { throw new Error('not ready') as any; },
  updateAccountName: async () => {},
  deleteAccount: async () => {},
  reload: async () => {},
});

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { activeAccountId } = useTenant();
  const [accounts, setAccounts] = useState<MetaAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeAccountId) {
      setAccounts([]);
      setLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from('meta_accounts')
        .select('*')
        .eq('account_id', activeAccountId)
        .order('created_at', { ascending: true });
      setAccounts((data as MetaAccount[]) ?? []);
    } catch (e) {
      console.error("[AccountProvider] Error fetching accounts:", e);
    } finally {
      setLoading(false);
    }
  }, [activeAccountId]);

  useEffect(() => { load(); }, [load]);

  const activeAccount = accounts.find(a => a.is_active) ?? null;

  const switchAccount = useCallback(async (id: string) => {
    setAccounts(prev => prev.map(a => ({ ...a, is_active: a.id === id })));
    await supabase.from('meta_accounts').update({ is_active: false }).eq('account_id', activeAccountId!).neq('id', id);
    await supabase.from('meta_accounts').update({ is_active: true }).eq('id', id);
    const account = accounts.find(a => a.id === id);
    if (account && activeAccountId) {
      await supabase.from('app_settings').upsert(
        [{ key: 'meta_ad_account_id', value: account.ad_account_id, account_id: activeAccountId } as any],
        { onConflict: 'account_id,key' }
      );
    }
  }, [accounts, activeAccountId]);

  const addAccount = useCallback(async (name: string, adAccountId: string) => {
    if (!activeAccountId) throw new Error('No active tenant');
    const isFirst = accounts.length === 0;
    const { data, error } = await supabase
      .from('meta_accounts')
      .insert({ name, access_token: '', ad_account_id: adAccountId, is_active: isFirst, account_id: activeAccountId } as any)
      .select().single();
    if (error) throw new Error(error.message);
    if (isFirst) {
      await supabase.from('app_settings').upsert(
        [{ key: 'meta_ad_account_id', value: adAccountId, account_id: activeAccountId } as any],
        { onConflict: 'account_id,key' }
      );
    }
    await load();
    return data as MetaAccount;
  }, [accounts.length, load, activeAccountId]);

  const updateAccountName = useCallback(async (id: string, name: string) => {
    await supabase.from('meta_accounts').update({ name }).eq('id', id);
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, name } : a));
  }, []);

  const deleteAccount = useCallback(async (id: string) => {
    const wasActive = accounts.find(a => a.id === id)?.is_active;
    await supabase.from('meta_accounts').delete().eq('id', id);
    const remaining = accounts.filter(a => a.id !== id);
    setAccounts(remaining);
    if (wasActive && remaining.length > 0) {
      await switchAccount(remaining[0].id);
    }
  }, [accounts, switchAccount]);

  return (
    <AccountContext.Provider value={{ accounts, activeAccount, loading, switchAccount, addAccount, updateAccountName, deleteAccount, reload: load }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccountContext() {
  return useContext(AccountContext);
}

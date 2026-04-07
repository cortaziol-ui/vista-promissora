import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface RoletaSpinRecord {
  id: string;
  vendedor: string;
  motivo: string;
  motivoTitulo: string;
  premio: string;
  data: string;
  hora: string;
  status: 'pendente' | 'pago';
  createdAt?: string;
}

const LOCAL_KEY_SPINS = 'roleta_historico_v2';
const LOCAL_KEY_LIMITS = 'roleta_limites_v2';
const MIGRATION_FLAG = 'roleta_migrated_to_supabase';

const COOLDOWN_HOURS: Record<string, number> = {
  volume_diario: 24,
  meta_semanal_100: 168,
  meta_mensal_70: 168,
  meta_mensal_100: 168,
};

// --- localStorage helpers (fallback) ---

function loadLocalSpins(): RoletaSpinRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY_SPINS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalSpins(spins: RoletaSpinRecord[]) {
  localStorage.setItem(LOCAL_KEY_SPINS, JSON.stringify(spins));
}

function loadLocalLimits(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LOCAL_KEY_LIMITS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalLimits(limits: Record<string, string>) {
  localStorage.setItem(LOCAL_KEY_LIMITS, JSON.stringify(limits));
}

// --- DB row <-> record mapping ---

interface DbRow {
  id: string;
  vendedor: string;
  motivo: string;
  motivo_titulo: string;
  premio: string;
  data: string;
  hora: string;
  status: string;
  created_at: string;
  created_by: string | null;
}

function rowToRecord(row: DbRow): RoletaSpinRecord {
  return {
    id: row.id,
    vendedor: row.vendedor,
    motivo: row.motivo,
    motivoTitulo: row.motivo_titulo,
    premio: row.premio,
    data: row.data,
    hora: row.hora,
    status: row.status as 'pendente' | 'pago',
    createdAt: row.created_at,
  };
}

/** Parse "DD/MM/YYYY" + "HH:MM" into ISO string */
function parseLocalDateTime(data: string, hora: string): string {
  const [d, m, y] = data.split('/');
  return `${y}-${m}-${d}T${hora}:00`;
}

export function useRoletaSpins() {
  const { user } = useAuth();
  const [spins, setSpins] = useState<RoletaSpinRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const migratedRef = useRef(false);

  // --- Fetch spins from Supabase ---
  const fetchSpins = useCallback(async () => {
    try {
      const { data, error } = await (supabase.from as any)('roleta_spins')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      const records = (data as DbRow[]).map(rowToRecord);
      setSpins(records);
      // Sync to localStorage for fallback
      saveLocalSpins(records.slice(0, 50));
      return records;
    } catch (err) {
      console.error('[useRoletaSpins] fetchSpins error, falling back to localStorage:', err);
      const local = loadLocalSpins();
      setSpins(local);
      return local;
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Migrate localStorage data to Supabase (once) ---
  const migrateLocalStorage = useCallback(async (userId: string) => {
    if (localStorage.getItem(MIGRATION_FLAG)) return;

    const localSpins = loadLocalSpins();
    if (localSpins.length === 0) {
      localStorage.setItem(MIGRATION_FLAG, 'true');
      return;
    }

    try {
      const rows = localSpins.map((s) => ({
        vendedor: s.vendedor,
        motivo: s.motivo,
        motivo_titulo: s.motivoTitulo,
        premio: s.premio,
        data: s.data,
        hora: s.hora,
        status: s.status,
        created_by: userId,
        created_at: parseLocalDateTime(s.data, s.hora),
      }));

      await (supabase.from as any)('roleta_spins').insert(rows);
      localStorage.setItem(MIGRATION_FLAG, 'true');
    } catch (err) {
      console.error('[useRoletaSpins] migration error:', err);
      // Don't set flag — will retry next time
    }
  }, []);

  // --- Init: migrate + fetch ---
  useEffect(() => {
    if (!user) return;
    if (migratedRef.current) return;
    migratedRef.current = true;

    (async () => {
      await migrateLocalStorage(user.id);
      await fetchSpins();
    })();
  }, [user, migrateLocalStorage, fetchSpins]);

  // --- Save a new spin ---
  const saveSpin = useCallback(
    async (record: Omit<RoletaSpinRecord, 'id' | 'createdAt'>): Promise<RoletaSpinRecord | null> => {
      const now = new Date();

      // Try Supabase first
      try {
        const { data, error } = await (supabase.from as any)('roleta_spins')
          .insert({
            vendedor: record.vendedor,
            motivo: record.motivo,
            motivo_titulo: record.motivoTitulo,
            premio: record.premio,
            data: record.data,
            hora: record.hora,
            status: record.status,
            created_by: user?.id ?? null,
          })
          .select()
          .single();

        if (error) throw error;

        const saved = rowToRecord(data as DbRow);
        setSpins((prev) => [saved, ...prev].slice(0, 100));
        // Also update localStorage
        saveLocalSpins([saved, ...loadLocalSpins()].slice(0, 50));
        // Update rate limit in localStorage
        const limits = loadLocalLimits();
        limits[`${record.vendedor}_${record.motivo}`] = now.toISOString();
        saveLocalLimits(limits);
        return saved;
      } catch (err) {
        console.error('[useRoletaSpins] saveSpin Supabase error, saving to localStorage:', err);

        // Fallback to localStorage
        const fallback: RoletaSpinRecord = {
          ...record,
          id: `${Date.now()}`,
        };
        const updated = [fallback, ...spins].slice(0, 50);
        setSpins(updated);
        saveLocalSpins(updated);

        const limits = loadLocalLimits();
        limits[`${record.vendedor}_${record.motivo}`] = now.toISOString();
        saveLocalLimits(limits);
        return fallback;
      }
    },
    [user, spins],
  );

  // --- Check rate limit via Supabase ---
  const checkRateLimit = useCallback(
    async (vendedor: string, motivo: string): Promise<{ allowed: boolean; hoursRemaining: number }> => {
      const cooldown = COOLDOWN_HOURS[motivo] ?? 24;

      try {
        const { data, error } = await (supabase.from as any)('roleta_spins')
          .select('created_at')
          .eq('vendedor', vendedor)
          .eq('motivo', motivo)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (!data || data.length === 0) {
          return { allowed: true, hoursRemaining: 0 };
        }

        const lastSpinTime = new Date(data[0].created_at).getTime();
        const elapsed = (Date.now() - lastSpinTime) / (1000 * 60 * 60);

        if (elapsed >= cooldown) {
          return { allowed: true, hoursRemaining: 0 };
        }
        return { allowed: false, hoursRemaining: cooldown - elapsed };
      } catch (err) {
        console.error('[useRoletaSpins] checkRateLimit Supabase error, falling back to localStorage:', err);

        // Fallback to localStorage
        const limits = loadLocalLimits();
        const key = `${vendedor}_${motivo}`;
        const last = limits[key];
        if (!last) return { allowed: true, hoursRemaining: 0 };

        const elapsed = (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60);
        if (elapsed >= cooldown) return { allowed: true, hoursRemaining: 0 };
        return { allowed: false, hoursRemaining: cooldown - elapsed };
      }
    },
    [],
  );

  return {
    spins,
    loading,
    saveSpin,
    checkRateLimit,
    refresh: fetchSpins,
  };
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';

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
const RECOVERY_FLAG = 'roleta_recovery_20260407';

// No cooldown limits — spins are unlimited once conditions are met

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
      for (const s of localSpins) {
        try {
          await (supabase.from as any)('roleta_spins').insert({
            vendedor: s.vendedor,
            motivo: s.motivo,
            motivo_titulo: s.motivoTitulo,
            premio: s.premio,
            data: s.data,
            hora: s.hora,
            status: s.status,
            created_by: userId,
            created_at: parseLocalDateTime(s.data, s.hora),
          });
        } catch {
          // Skip individual failures (duplicates, etc)
        }
      }
      localStorage.setItem(MIGRATION_FLAG, 'true');
    } catch (err) {
      console.error('[useRoletaSpins] migration error:', err);
    }
  }, []);

  // --- Recover local spins that failed to save to Supabase (one-time) ---
  const recoverLocalSpins = useCallback(async (userId: string) => {
    if (localStorage.getItem(RECOVERY_FLAG)) return;

    const localSpins = loadLocalSpins();
    if (localSpins.length === 0) {
      localStorage.setItem(RECOVERY_FLAG, 'true');
      return;
    }

    // Fetch existing spins to avoid duplicates
    let existingKeys = new Set<string>();
    try {
      const { data } = await (supabase.from as any)('roleta_spins')
        .select('vendedor, motivo, data, hora')
        .limit(200);
      if (data) {
        existingKeys = new Set(
          (data as Array<{ vendedor: string; motivo: string; data: string; hora: string }>)
            .map(r => `${r.vendedor}_${r.motivo}_${r.data}_${r.hora}`)
        );
      }
    } catch {
      // Can't check — skip recovery this time, will retry on next load
      return;
    }

    let recovered = 0;
    for (const s of localSpins) {
      const key = `${s.vendedor}_${s.motivo}_${s.data}_${s.hora}`;
      if (existingKeys.has(key)) continue;

      try {
        const { error } = await (supabase.from as any)('roleta_spins').insert({
          vendedor: s.vendedor,
          motivo: s.motivo,
          motivo_titulo: s.motivoTitulo,
          premio: s.premio,
          data: s.data,
          hora: s.hora,
          status: s.status,
          created_by: userId,
          created_at: parseLocalDateTime(s.data, s.hora),
        });
        if (!error) recovered++;
      } catch {
        // Skip individual failures
      }
    }

    if (recovered > 0) {
      toast.success(`${recovered} girada(s) recuperada(s) com sucesso!`);
    }
    localStorage.setItem(RECOVERY_FLAG, 'true');
  }, []);

  // --- Init: migrate + recover + fetch ---
  useEffect(() => {
    if (!user) return;
    if (migratedRef.current) return;
    migratedRef.current = true;

    (async () => {
      await migrateLocalStorage(user.id);
      await recoverLocalSpins(user.id);
      await fetchSpins();
    })();
  }, [user, migrateLocalStorage, recoverLocalSpins, fetchSpins]);

  // --- Save a new spin ---
  const saveSpin = useCallback(
    async (record: Omit<RoletaSpinRecord, 'id' | 'createdAt'>): Promise<RoletaSpinRecord | null> => {
      const now = new Date();

      if (!user?.id) {
        console.error('[useRoletaSpins] saveSpin: user not authenticated');
        toast.error('Erro ao salvar girada: usuário não autenticado.');
        const fallback: RoletaSpinRecord = { ...record, id: `local_${Date.now()}` };
        const updated = [fallback, ...spins].slice(0, 50);
        setSpins(updated);
        saveLocalSpins(updated);
        const limits = loadLocalLimits();
        limits[`${record.vendedor}_${record.motivo}`] = now.toISOString();
        saveLocalLimits(limits);
        return fallback;
      }

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
            created_by: user.id,
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
        toast.warning('Girada salva localmente. Será sincronizada na próxima vez.');

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

  // --- Check rate limit (disabled — always allowed) ---
  const checkRateLimit = useCallback(
    async (_vendedor: string, _motivo: string): Promise<{ allowed: boolean; hoursRemaining: number }> => {
      return { allowed: true, hoursRemaining: 0 };
    },
    [],
  );

  // --- Count spins used today for "por_venda" motive ---
  const getSpinsUsedToday = useCallback(
    (vendedor: string): number => {
      const today = new Date().toLocaleDateString('pt-BR');
      return spins.filter(s => s.vendedor === vendedor && s.motivo === 'por_venda' && s.data === today).length;
    },
    [spins],
  );

  return {
    spins,
    loading,
    saveSpin,
    checkRateLimit,
    getSpinsUsedToday,
    refresh: fetchSpins,
  };
}

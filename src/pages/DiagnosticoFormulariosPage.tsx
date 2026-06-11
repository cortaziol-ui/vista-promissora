import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, RefreshCw, Loader2, Filter } from 'lucide-react';

type FormError = {
  id: string;
  account_id: string | null;
  form_name: string;
  error_code: string | null;
  error_message: string;
  error_details: string | null;
  error_hint: string | null;
  user_agent: string | null;
  url: string | null;
  payload_preview: Record<string, unknown> | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
};

export default function DiagnosticoFormulariosPage() {
  const { activeAccountId } = useTenant();
  const [errors, setErrors] = useState<FormError[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('form_errors' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (activeAccountId) {
      q = q.eq('account_id', activeAccountId);
    }
    if (!showResolved) {
      q = q.eq('resolved', false);
    }
    const { data, error } = await q;
    if (error) {
      console.error('[diagnostico] erro carregando form_errors:', error);
      setErrors([]);
    } else {
      setErrors((data ?? []) as unknown as FormError[]);
    }
    setLoading(false);
  }, [activeAccountId, showResolved]);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime: novo erro entra na tabela -> aparece imediato pro Caio
  useEffect(() => {
    if (!activeAccountId) return;
    const channel = supabase
      .channel(`form_errors_${activeAccountId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'form_errors', filter: `account_id=eq.${activeAccountId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeAccountId, load]);

  const markResolved = async (id: string, resolved: boolean) => {
    setUpdating(id);
    const { error } = await supabase
      .from('form_errors' as any)
      .update({
        resolved,
        resolved_at: resolved ? new Date().toISOString() : null,
      })
      .eq('id', id);
    if (error) {
      console.error('[diagnostico] erro atualizando:', error);
      alert('Nao foi possivel atualizar: ' + error.message);
    } else {
      void load();
    }
    setUpdating(null);
  };

  const unresolvedCount = errors.filter(e => !e.resolved).length;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Diagnostico de Formularios</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Lista de falhas ao enviar formularios publicos (ficha-rating). Atualiza em tempo real quando um cliente tenta enviar e da erro.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showResolved ? 'outline' : 'default'}
              size="sm"
              onClick={() => setShowResolved(v => !v)}
            >
              <Filter className="w-4 h-4 mr-2" />
              {showResolved ? 'Mostrar todos' : 'So nao-resolvidos'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Recarregar
            </Button>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${unresolvedCount > 0 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
              {unresolvedCount > 0 ? (
                <AlertCircle className="w-5 h-5 text-red-500" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Erros nao-resolvidos</p>
              <p className="text-2xl font-bold text-foreground">{unresolvedCount}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="glass-card p-10 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : errors.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-3" />
            <p className="text-foreground font-medium">Nenhum erro registrado</p>
            <p className="text-sm text-muted-foreground mt-1">Os formularios estao funcionando.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {errors.map(err => (
              <div
                key={err.id}
                className={`glass-card p-5 ${err.resolved ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs rounded bg-primary/20 text-primary font-medium">
                      {err.form_name}
                    </span>
                    {err.error_code && (
                      <span className="px-2 py-0.5 text-xs rounded bg-red-500/20 text-red-300 font-mono">
                        {err.error_code}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(err.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={err.resolved ? 'outline' : 'default'}
                    onClick={() => void markResolved(err.id, !err.resolved)}
                    disabled={updating === err.id}
                  >
                    {err.resolved ? 'Reabrir' : 'Marcar resolvido'}
                  </Button>
                </div>
                <p className="font-medium text-foreground mb-2">{err.error_message}</p>
                {err.error_details && (
                  <p className="text-sm text-muted-foreground mb-1">
                    <strong>Detalhes:</strong> {err.error_details}
                  </p>
                )}
                {err.error_hint && (
                  <p className="text-sm text-muted-foreground mb-1">
                    <strong>Hint:</strong> {err.error_hint}
                  </p>
                )}
                {err.payload_preview && (
                  <details className="text-xs text-muted-foreground mt-2">
                    <summary className="cursor-pointer">Dados parciais do cliente</summary>
                    <pre className="mt-2 p-3 rounded bg-black/30 overflow-x-auto">
                      {JSON.stringify(err.payload_preview, null, 2)}
                    </pre>
                  </details>
                )}
                {err.user_agent && (
                  <p className="text-xs text-muted-foreground mt-2 truncate">
                    <strong>UA:</strong> {err.user_agent}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

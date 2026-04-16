import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { Building2, Users, DollarSign, TrendingUp, ArrowRight } from 'lucide-react';

interface AccountStats {
  accountId: string;
  accountName: string;
  accountSlug: string;
  totalVendedores: number;
  totalClientes: number;
  faturamento: number;
  totalVendas: number;
}

export default function PainelControlePage() {
  const { accounts, switchAccount, enterOverviewMode } = useTenant();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AccountStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    enterOverviewMode();
  }, [enterOverviewMode]);

  useEffect(() => {
    async function loadStats() {
      if (accounts.length === 0) return;

      const results: AccountStats[] = [];

      for (const account of accounts) {
        const [vendRes, cliRes] = await Promise.all([
          supabase.from('vendedores').select('id', { count: 'exact', head: true }).eq('account_id', account.id),
          supabase.from('clientes').select('id, valor_total, parcela1_status, parcela2_status, entrada').eq('account_id', account.id),
        ]);

        const totalVendedores = vendRes.count || 0;
        const clientes = cliRes.data || [];
        const totalClientes = clientes.length;

        let faturamento = 0;
        for (const c of clientes) {
          faturamento += Number(c.entrada) || 0;
          if (c.parcela1_status === 'PAGO') faturamento += Number((c as any).parcela1_valor) || 0;
          if (c.parcela2_status === 'PAGO') faturamento += Number((c as any).parcela2_valor) || 0;
        }

        results.push({
          accountId: account.id,
          accountName: account.name,
          accountSlug: account.slug,
          totalVendedores,
          totalClientes,
          faturamento,
          totalVendas: totalClientes,
        });
      }

      setStats(results);
      setLoading(false);
    }

    loadStats();
  }, [accounts]);

  const handleSelectAccount = (accountId: string) => {
    switchAccount(accountId);
    navigate('/');
  };

  const totalFaturamento = stats.reduce((s, a) => s + a.faturamento, 0);
  const totalVendas = stats.reduce((s, a) => s + a.totalVendas, 0);
  const totalVendedores = stats.reduce((s, a) => s + a.totalVendedores, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold">Painel de Controle</h1>
        <p className="text-muted-foreground mt-1">Visão geral de todas as subcontas</p>
      </div>

      {/* Totais agregados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            <span className="text-sm text-muted-foreground">Faturamento Total</span>
          </div>
          <p className="text-2xl font-bold">
            {totalFaturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            <span className="text-sm text-muted-foreground">Total de Vendas</span>
          </div>
          <p className="text-2xl font-bold">{totalVendas}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-5 w-5 text-purple-500" />
            <span className="text-sm text-muted-foreground">Total de Vendedores</span>
          </div>
          <p className="text-2xl font-bold">{totalVendedores}</p>
        </div>
      </div>

      {/* Cards por subconta */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Subcontas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.map(st => (
            <button
              key={st.accountId}
              onClick={() => handleSelectAccount(st.accountId)}
              className="rounded-xl border bg-card p-6 text-left hover:border-primary/50 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{st.accountName}</h3>
                    <p className="text-xs text-muted-foreground">{st.accountSlug}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Faturamento</p>
                  <p className="text-sm font-semibold">
                    {st.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vendas</p>
                  <p className="text-sm font-semibold">{st.totalVendas}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vendedores</p>
                  <p className="text-sm font-semibold">{st.totalVendedores}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

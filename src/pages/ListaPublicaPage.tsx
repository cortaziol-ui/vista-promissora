import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ListaPublicaContent } from '@/components/ListaPublicaContent';
import type { ListaParceiros, ListaOrgao } from '@/hooks/useListasParceiros';

const NAVY = '#0a3d6b';

export default function ListaPublicaPage() {
  const { slug } = useParams<{ slug: string }>();
  const [lista, setLista] = useState<ListaParceiros | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!slug) {
        setError('Link inválido.');
        setLoading(false);
        return;
      }
      const { data: listaData, error: errLista } = await supabase
        .from('listas_parceiros')
        .select('*')
        .eq('slug_publico', slug)
        .maybeSingle();

      if (cancelled) return;

      if (errLista || !listaData) {
        setError('Lista não encontrada ou link expirado.');
        setLoading(false);
        return;
      }

      const { data: orgaosData } = await supabase
        .from('listas_parceiros_orgaos')
        .select('*')
        .eq('lista_id', listaData.id)
        .order('ordem', { ascending: true });

      if (cancelled) return;

      setLista({
        ...(listaData as Omit<ListaParceiros, 'orgaos'>),
        orgaos: (orgaosData ?? []) as ListaOrgao[],
      });
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel(`public_lista_${slug}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listas_parceiros' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listas_parceiros_orgaos' }, () => load())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [slug]);

  return (
    <div
      className="min-h-screen"
      style={{
        background: '#f5f5f5',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div className="max-w-[760px] mx-auto px-4 pt-6 pb-12 space-y-3">
        {/* Cabeçalho — card com formas geométricas à direita (mesmo padrão da FichaRatingPage) */}
        <div className="rounded-xl overflow-hidden shadow-sm relative" style={{ background: '#fff', height: '160px' }}>
          <div
            className="absolute top-0 right-0 w-[100px] sm:w-[120px]"
            style={{ background: NAVY, height: '110px', borderRadius: '0 0 0 20px' }}
          />
          <div
            className="absolute bottom-0 right-0 w-[80px] sm:w-[100px]"
            style={{ background: '#b0b8c1', height: '60px', borderRadius: '20px 0 0 0' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src="/logo-outcom.png"
              alt="out.com"
              className="h-24 sm:h-28 object-contain"
              style={{ mixBlendMode: 'multiply', filter: 'contrast(1.5) brightness(1.3)' }}
            />
          </div>
        </div>

        {/* Título */}
        <div className="rounded-xl shadow-sm overflow-hidden" style={{ background: '#fff', borderTop: `4px solid ${NAVY}` }}>
          <div className="px-6 py-5">
            <h1 className="text-2xl font-semibold" style={{ color: NAVY }}>
              Acompanhamento Processos Limpa Nome
            </h1>
            <p className="text-sm mt-1" style={{ color: '#888' }}>
              Status em tempo real · Atualizado pela equipe Out.com
            </p>
          </div>
        </div>

        {/* Conteúdo */}
        {loading ? (
          <div className="rounded-xl shadow-sm p-12 flex items-center justify-center" style={{ background: '#fff' }}>
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: NAVY }} />
          </div>
        ) : error ? (
          <div
            className="rounded-xl shadow-sm overflow-hidden"
            style={{ background: '#fff', borderTop: `4px solid ${NAVY}` }}
          >
            <div className="px-6 py-8 text-center">
              <h2 className="text-lg font-semibold mb-2" style={{ color: NAVY }}>
                Não conseguimos abrir esta lista
              </h2>
              <p className="text-sm" style={{ color: '#6b7280' }}>
                {error} Confirme com a equipe Out.com se o link está correto.
              </p>
            </div>
          </div>
        ) : lista ? (
          <>
            <ListaPublicaContent lista={lista} />

            {/* Como funciona */}
            <div className="rounded-xl shadow-sm overflow-hidden" style={{ background: '#fff', borderTop: `4px solid ${NAVY}` }}>
              <div className="px-6 py-5">
                <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: NAVY }}>
                  Como acompanhar
                </h3>
                <p className="text-[13px] leading-relaxed" style={{ color: '#4b5563' }}>
                  As informações são organizadas por <strong style={{ color: '#111827' }}>lista (data)</strong> e por{' '}
                  <strong style={{ color: '#111827' }}>órgão</strong> (SERASA, SPC, BOA VISTA, CENPROT SP, CENPROT NACIONAL).
                  Em caso de dúvidas específicas sobre seu CPF ou contrato, entre em contato direto com seu consultor da Out.com.
                </p>
              </div>
            </div>
          </>
        ) : null}

        {/* Footer */}
        <div className="text-center pt-4 pb-2 text-[11px] uppercase tracking-wider" style={{ color: '#9ca3af' }}>
          Out.com · Inteligência financeira e limpa nome
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Search, ChevronLeft, ChevronRight, Eye, Loader2, Trash2, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';

interface FichaRating {
  id: string;
  slug: string;
  status: string;
  nome: string;
  cpf: string;
  rg: string;
  data_nascimento: string;
  estado_civil: string;
  nome_pai: string;
  nome_mae: string;
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  tel_residencial: string;
  tel_celular: string;
  email: string;
  empresa: string;
  data_admissao: string;
  salario: number;
  renda_familiar: number;
  faturamento: number;
  bancos: any[];
  referencias: any[];
  login_serasa: string;
  senha_serasa: string;
  possui_imovel1: boolean;
  imovel1_tipo: string;
  imovel1_localizacao: string;
  imovel1_bairro: string;
  imovel1_cidade: string;
  imovel1_uf: string;
  imovel1_valor: number;
  possui_imovel2: boolean;
  imovel2_tipo: string;
  imovel2_localizacao: string;
  imovel2_bairro: string;
  imovel2_cidade: string;
  imovel2_uf: string;
  imovel2_valor: number;
  possui_veiculo: boolean;
  veiculo_valor: number;
  veiculo_ano: string;
  veiculo_placa: string;
  veiculo_estado: string;
  possui_empresa: boolean;
  empresa_nome: string;
  empresa_cnpj: string;
  created_at: string;
}

const ITEMS_PER_PAGE = 15;

const statusColors: Record<string, string> = {
  pendente: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  enviada: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  aprovado: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  rejeitado: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function FichasRespostasPage() {
  const [fichas, setFichas] = useState<FichaRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<FichaRating | null>(null);

  useEffect(() => {
    fetchFichas();
  }, []);

  const fetchFichas = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('fichas_rating' as any)
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setFichas(data as any);
    setLoading(false);
  };

  const toggleStatus = async (ficha: FichaRating) => {
    const newStatus = ficha.status === 'pendente' ? 'enviada' : 'pendente';
    const { error } = await supabase
      .from('fichas_rating' as any)
      .update({ status: newStatus } as any)
      .eq('id', ficha.id);
    if (error) toast.error('Erro ao atualizar status');
    else {
      setFichas(prev => prev.map(f => f.id === ficha.id ? { ...f, status: newStatus } : f));
      toast.success(`Status alterado para "${newStatus}"`);
    }
  };

  const deleteFicha = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta ficha?')) return;
    const { error } = await supabase
      .from('fichas_rating' as any)
      .delete()
      .eq('id', id);
    if (error) toast.error('Erro ao excluir ficha');
    else {
      setFichas(prev => prev.filter(f => f.id !== id));
      toast.success('Ficha excluída');
    }
  };

  const filtered = fichas.filter(f => {
    if (!search) return true;
    const q = search.toLowerCase();
    return f.nome?.toLowerCase().includes(q) || f.cpf?.includes(q) || f.email?.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  const fmtDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const fmtCurrency = (v: number) => {
    if (!v && v !== 0) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fichas Rating — Respostas</h1>
          <p className="text-muted-foreground text-sm">{filtered.length} fichas recebidas</p>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF ou email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="pl-9 bg-secondary border-border/50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                  <tr className="text-muted-foreground border-b border-border/50 text-xs uppercase tracking-wider">
                    <th className="text-left py-3 px-3">Data</th>
                    <th className="text-left py-3 px-3 min-w-[200px]">Nome</th>
                    <th className="text-left py-3 px-3">CPF</th>
                    <th className="text-left py-3 px-3">Telefone</th>
                    <th className="text-left py-3 px-3">Cidade/UF</th>
                    <th className="text-left py-3 px-3">Status</th>
                    <th className="text-center py-3 px-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 && (
                    <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">Nenhuma ficha encontrada</td></tr>
                  )}
                  {paginated.map((f, i) => (
                    <tr key={f.id} className={`border-b border-border/20 hover:bg-secondary/40 transition-colors ${i % 2 === 0 ? 'bg-card/40' : 'bg-card/20'}`}>
                      <td className="py-3 px-3 text-muted-foreground whitespace-nowrap text-xs">{fmtDate(f.created_at)}</td>
                      <td className="py-3 px-3 font-medium text-foreground">{f.nome}</td>
                      <td className="py-3 px-3 text-muted-foreground font-mono text-xs">{f.cpf}</td>
                      <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">{f.tel_celular || '—'}</td>
                      <td className="py-3 px-3 text-muted-foreground">{f.cidade && f.estado ? `${f.cidade}/${f.estado}` : '—'}</td>
                      <td className="py-3 px-3">
                        <Badge className={`text-[10px] border ${statusColors[f.status] || 'bg-muted/20 text-muted-foreground'}`}>
                          {f.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelected(f)} title="Visualizar">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleStatus(f)} title="Alterar status">
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => deleteFicha(f.id)} title="Excluir">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/30">
                <p className="text-xs text-muted-foreground">Página {page + 1} de {totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>Ficha de {selected?.nome}</DialogTitle>
            <DialogDescription>Enviada em {selected ? fmtDate(selected.created_at) : ''}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="overflow-y-auto flex-1 pr-1 space-y-6 py-4">
              <DetailSection title="Dados Pessoais">
                <DetailRow label="Nome" value={selected.nome} />
                <DetailRow label="CPF" value={selected.cpf} />
                <DetailRow label="RG" value={selected.rg} />
                <DetailRow label="Data de Nascimento" value={selected.data_nascimento} />
                <DetailRow label="Estado Civil" value={selected.estado_civil} />
                <DetailRow label="Nome do Pai" value={selected.nome_pai} />
                <DetailRow label="Nome da Mãe" value={selected.nome_mae} />
              </DetailSection>

              <DetailSection title="Endereço">
                <DetailRow label="CEP" value={selected.cep} />
                <DetailRow label="Endereço" value={[selected.endereco, selected.numero].filter(Boolean).join(', ')} />
                <DetailRow label="Bairro" value={selected.bairro} />
                <DetailRow label="Cidade/UF" value={[selected.cidade, selected.estado].filter(Boolean).join('/')} />
              </DetailSection>

              <DetailSection title="Contato">
                <DetailRow label="Tel. Residencial" value={selected.tel_residencial} />
                <DetailRow label="Tel. Celular" value={selected.tel_celular} />
                <DetailRow label="Email" value={selected.email} />
              </DetailSection>

              <DetailSection title="Dados Profissionais">
                <DetailRow label="Empresa" value={selected.empresa} />
                <DetailRow label="Data Admissão" value={selected.data_admissao} />
                <DetailRow label="Salário" value={fmtCurrency(selected.salario)} />
                <DetailRow label="Renda Familiar" value={fmtCurrency(selected.renda_familiar)} />
                <DetailRow label="Faturamento" value={fmtCurrency(selected.faturamento)} />
              </DetailSection>

              {selected.bancos && selected.bancos.length > 0 && (
                <DetailSection title="Bancos">
                  {selected.bancos.map((b: any, i: number) => (
                    <DetailRow key={i} label={`Banco ${i + 1}`} value={`${b.banco} | Ag: ${b.agencia} | Conta: ${b.conta}`} />
                  ))}
                </DetailSection>
              )}

              {selected.referencias && selected.referencias.length > 0 && (
                <DetailSection title="Referências Pessoais">
                  {selected.referencias.map((r: any, i: number) => (
                    <DetailRow key={i} label={`Ref. ${i + 1}`} value={`${r.nome} — ${r.celular} (${r.grau})`} />
                  ))}
                </DetailSection>
              )}

              <DetailSection title="Acesso Serasa">
                <DetailRow label="Login" value={selected.login_serasa} />
                <DetailRow label="Senha" value={selected.senha_serasa ? '••••••••' : '—'} />
              </DetailSection>

              <DetailSection title="Bens e Patrimônio">
                {selected.possui_imovel1 && (
                  <>
                    <DetailRow label="Imóvel 1" value={`${selected.imovel1_tipo || ''} — ${selected.imovel1_cidade || ''}/${selected.imovel1_uf || ''}`} />
                    <DetailRow label="Valor Imóvel 1" value={fmtCurrency(selected.imovel1_valor)} />
                  </>
                )}
                {selected.possui_imovel2 && (
                  <>
                    <DetailRow label="Imóvel 2" value={`${selected.imovel2_tipo || ''} — ${selected.imovel2_cidade || ''}/${selected.imovel2_uf || ''}`} />
                    <DetailRow label="Valor Imóvel 2" value={fmtCurrency(selected.imovel2_valor)} />
                  </>
                )}
                {selected.possui_veiculo && (
                  <>
                    <DetailRow label="Veículo" value={`Placa: ${selected.veiculo_placa || '—'} | Ano: ${selected.veiculo_ano || '—'}`} />
                    <DetailRow label="Valor Veículo" value={fmtCurrency(selected.veiculo_valor)} />
                  </>
                )}
                {selected.possui_empresa && (
                  <DetailRow label="Empresa" value={`${selected.empresa_nome || '—'} — CNPJ: ${selected.empresa_cnpj || '—'}`} />
                )}
                {!selected.possui_imovel1 && !selected.possui_imovel2 && !selected.possui_veiculo && !selected.possui_empresa && (
                  <p className="text-sm text-muted-foreground">Nenhum bem declarado</p>
                )}
              </DetailSection>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-2 pb-1 border-b border-border/30">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
        {children}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs text-foreground font-medium text-right">{value || '—'}</span>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MetaAdsIntegration from '@/components/MetaAdsIntegration';
import { useSalesData } from '@/contexts/SalesDataContext';
import { useMonthlyGoals } from '@/hooks/useMonthlyGoals';
import { useAccountContext } from '@/contexts/AccountContext';
import { fetchCampaignInsights, type MetaCampaign } from '@/lib/metaAdsApi';
import { useCampaignLinks } from '@/hooks/useCampaignLinks';
import { matchAllCampaigns } from '@/lib/campaignMatcher';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, UserPlus, Check, X, Calendar, Loader2, Link2, Wand2, AlertTriangle, CheckCircle2, Trophy } from 'lucide-react';
import { VendorAvatar } from '@/components/VendorAvatar';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const MESES = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

export default function SettingsPage() {
  const { isAdmin, isManager } = useAuth();
  const {
    vendedores,
    addVendedor, updateVendedor, deleteVendedor,
  } = useSalesData();
  const { activeAccount } = useAccountContext();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', monthlyGoal: 10, aniversario: '', foto: '' });

  // Month selector
  const currentMonth = new Date().toISOString().slice(5, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const year = new Date().getFullYear();
  const monthYM = `${year}-${selectedMonth}`;

  // Per-month goals
  const {
    metaEmpresaVendas, metaComercialVendas,
    setMetaEmpresaVendas, setMetaComercialVendas,
    vendorGoals, setVendorGoal,
  } = useMonthlyGoals(monthYM);

  // Inline editing state
  const [editingMetaEmpresa, setEditingMetaEmpresa] = useState(false);
  const [metaEmpresaDraft, setMetaEmpresaDraft] = useState(metaEmpresaVendas);
  const [editingMetaComercial, setEditingMetaComercial] = useState(false);
  const [metaComercialDraft, setMetaComercialDraft] = useState(metaComercialVendas);
  const [editingVendorId, setEditingVendorId] = useState<number | null>(null);
  const [vendorMetaDraft, setVendorMetaDraft] = useState(0);

  // Sync drafts when month-specific goals load
  useEffect(() => {
    setMetaEmpresaDraft(metaEmpresaVendas);
    setEditingMetaEmpresa(false);
  }, [metaEmpresaVendas]);
  useEffect(() => {
    setMetaComercialDraft(metaComercialVendas);
    setEditingMetaComercial(false);
  }, [metaComercialVendas]);

  // Commission tiers state
  interface Tier { id: string; faixa_nome: string; pct_meta: number; premiacao: number; sort_order: number; }
  const [tiers, setTiers] = useState<Tier[]>([]);

  const fetchTiers = useCallback(async () => {
    const { data } = await (supabase.from as any)('commission_tiers').select('*').eq('month', monthYM).is('vendedor_id', null).order('sort_order');
    if (data) setTiers(data as Tier[]);
  }, [monthYM]);

  useEffect(() => { fetchTiers(); }, [fetchTiers]);

  const handleUpdateTierPremiacao = async (id: string, premiacao: number) => {
    await (supabase.from as any)('commission_tiers').update({ premiacao }).eq('id', id);
    fetchTiers();
  };

  // Campaign linking state
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [metaCampaigns, setMetaCampaigns] = useState<MetaCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);

  // Load access token
  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'meta_access_token').maybeSingle()
      .then(({ data }) => { if (data?.value) setAccessToken(data.value); });
  }, []);

  // Load campaigns when month/token/account changes
  const loadCampaigns = useCallback(async () => {
    if (!accessToken || !activeAccount?.ad_account_id) return;
    setCampaignsLoading(true);
    const lastDay = new Date(year, Number(selectedMonth), 0).getDate();
    const since = `${year}-${selectedMonth}-01`;
    const until = `${year}-${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
    const result = await fetchCampaignInsights(accessToken, activeAccount.ad_account_id, { since, until });
    if (!result.error) setMetaCampaigns(result.campaigns);
    setCampaignsLoading(false);
  }, [accessToken, activeAccount, selectedMonth, year]);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  // Campaign links hook
  const { links, aliases, saveLink, saveBulkLinks } = useCampaignLinks({
    campaigns: metaCampaigns,
    vendedores,
    month: monthYM,
  });

  // Sort: active campaigns first
  const sortedLinks = [...links].sort((a, b) => {
    const ca = metaCampaigns.find(c => c.id === a.campaign_id);
    const cb = metaCampaigns.find(c => c.id === b.campaign_id);
    const aActive = ca?.status === 'ACTIVE' ? 0 : 1;
    const bActive = cb?.status === 'ACTIVE' ? 0 : 1;
    return aActive - bActive;
  });
  const unlinkedCampaigns = links.filter(l => !l.vendedor_id).length;
  const linkedVendorIds = new Set(links.filter(l => l.vendedor_id).map(l => l.vendedor_id));
  const unlinkedVendors = vendedores.filter(v => !linkedVendorIds.has(v.id)).length;

  const handleAutoDetect = async () => {
    const autoLinks = matchAllCampaigns(metaCampaigns, aliases, vendedores, []);
    const linked = autoLinks.filter(l => l.vendedor_id);
    await saveBulkLinks(linked);
    toast({ title: 'Auto-detecção concluída', description: `${linked.length} campanhas vinculadas` });
  };

  // Meta handlers
  const handleSaveMetaEmpresa = () => {
    if (metaEmpresaDraft > 0) {
      setMetaEmpresaVendas(metaEmpresaDraft);
      toast({ title: 'Meta atualizada', description: `Meta da empresa alterada para ${metaEmpresaDraft} vendas` });
    }
    setEditingMetaEmpresa(false);
  };

  const handleSaveMetaComercial = () => {
    if (metaComercialDraft > 0) {
      setMetaComercialVendas(metaComercialDraft);
      toast({ title: 'Meta atualizada', description: `Meta comercial alterada para ${metaComercialDraft} vendas` });
    }
    setEditingMetaComercial(false);
  };

  const handleStartEditVendor = (id: number) => {
    setEditingVendorId(id);
    setVendorMetaDraft(vendorGoals.get(id) ?? vendedores.find(v => v.id === id)?.meta ?? 0);
  };

  const handleSaveVendorMeta = (id: number, nome: string) => {
    if (vendorMetaDraft >= 0) {
      setVendorGoal(id, vendorMetaDraft);
      toast({ title: 'Meta atualizada', description: `Meta de ${nome} alterada para ${vendorMetaDraft} vendas (${MESES.find(m => m.value === selectedMonth)?.label})` });
    }
    setEditingVendorId(null);
  };

  const handleAddUser = async () => {
    if (!newUser.name.trim()) {
      toast({ title: 'Erro', description: 'Nome é obrigatório.', variant: 'destructive' });
      return;
    }
    const result = await addVendedor({
      nome: newUser.name.trim(),
      cargo: 'Vendedor',
      meta: newUser.monthlyGoal,
      avatar: '👤',
      aniversario: newUser.aniversario || undefined,
      foto: newUser.foto || undefined,
    });
    if (result) {
      toast({ title: 'Vendedor adicionado', description: `${newUser.name} foi adicionado ao sistema.` });
    } else {
      toast({ title: 'Erro', description: 'Falha ao salvar vendedor.', variant: 'destructive' });
    }
    setDialogOpen(false);
    setNewUser({ name: '', email: '', monthlyGoal: 10, aniversario: '', foto: '' });
  };

  const somaMetasIndividuais = vendedores.reduce((s, v) => s + (vendorGoals.get(v.id) ?? v.meta), 0);

  if (!isAdmin && !isManager) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-foreground">Configurações</h1>

      {isAdmin && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Metas da Empresa</h2>

          {/* Month selector */}
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Mês de referência:</span>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px] bg-secondary border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESES.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Meta Empresa */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">Meta da Empresa (nº de vendas)</p>
            {editingMetaEmpresa ? (
              <div className="flex items-center gap-3">
                <Input type="number" value={metaEmpresaDraft} onChange={e => setMetaEmpresaDraft(Number(e.target.value))} className="bg-secondary border-border/50 w-32" autoFocus onKeyDown={e => e.key === 'Enter' && handleSaveMetaEmpresa()} />
                <span className="text-muted-foreground text-sm">vendas</span>
                <Button size="sm" variant="ghost" onClick={handleSaveMetaEmpresa}><Check className="w-4 h-4 text-green-500" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingMetaEmpresa(false)}><X className="w-4 h-4 text-red-400" /></Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-2xl font-bold text-foreground">{metaEmpresaVendas} vendas</p>
                <Button size="sm" variant="ghost" onClick={() => { setMetaEmpresaDraft(metaEmpresaVendas); setEditingMetaEmpresa(true); }}><Pencil className="w-4 h-4" /></Button>
              </div>
            )}
          </div>

          {/* Meta Comercial */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">Meta Comercial (nº de vendas)</p>
            {editingMetaComercial ? (
              <div className="flex items-center gap-3">
                <Input type="number" value={metaComercialDraft} onChange={e => setMetaComercialDraft(Number(e.target.value))} className="bg-secondary border-border/50 w-32" autoFocus onKeyDown={e => e.key === 'Enter' && handleSaveMetaComercial()} />
                <span className="text-muted-foreground text-sm">vendas</span>
                <Button size="sm" variant="ghost" onClick={handleSaveMetaComercial}><Check className="w-4 h-4 text-green-500" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingMetaComercial(false)}><X className="w-4 h-4 text-red-400" /></Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-2xl font-bold text-foreground">{metaComercialVendas} vendas</p>
                <Button size="sm" variant="ghost" onClick={() => { setMetaComercialDraft(metaComercialVendas); setEditingMetaComercial(true); }}><Pencil className="w-4 h-4" /></Button>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">Soma das metas individuais: {somaMetasIndividuais} vendas</p>
        </div>
      )}

      {/* Vendedores */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Vendedores</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><UserPlus className="w-4 h-4 mr-2" />Adicionar</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Novo Vendedor</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">Nome</label>
                  <Input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} className="bg-secondary border-border/50 mt-1" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Meta Mensal (nº de vendas)</label>
                  <Input type="number" value={newUser.monthlyGoal} onChange={e => setNewUser({ ...newUser, monthlyGoal: Number(e.target.value) })} className="bg-secondary border-border/50 mt-1" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Aniversário</label>
                  <Input type="date" value={newUser.aniversario} onChange={e => setNewUser({ ...newUser, aniversario: e.target.value })} className="bg-secondary border-border/50 mt-1" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Foto</label>
                  <input type="file" accept="image/*" className="mt-1 text-sm text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-secondary file:text-foreground hover:file:bg-secondary/80" onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setNewUser(prev => ({ ...prev, foto: reader.result as string }));
                    reader.readAsDataURL(file);
                  }} />
                </div>
                <Button onClick={handleAddUser} className="w-full">Salvar Vendedor</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-border/50">
                <th className="text-left py-3 px-2">Nome</th>
                <th className="text-left py-3 px-2">Cargo</th>
                <th className="text-right py-3 px-2">Meta</th>
                <th className="text-center py-3 px-2">Aniversário</th>
                <th className="text-center py-3 px-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {vendedores.map(v => (
                <tr key={v.id} className="border-b border-border/30 hover:bg-secondary/50 transition-colors">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer shrink-0">
                        <VendorAvatar foto={v.foto} avatar={v.avatar} className="hover:opacity-75 transition-opacity" />
                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => updateVendedor(v.id, { foto: reader.result as string } as any);
                          reader.readAsDataURL(file);
                        }} />
                      </label>
                      <Input defaultValue={v.nome} onBlur={e => { if (e.target.value !== v.nome) updateVendedor(v.id, { nome: e.target.value }); }} className="bg-transparent border-transparent hover:border-border/50 focus:border-border/50 h-8 w-40 text-foreground font-medium px-1" />
                    </div>
                  </td>
                  <td className="py-3 px-2 text-muted-foreground">{v.cargo}</td>
                  <td className="py-3 px-2 text-right">
                    {editingVendorId === v.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <Input type="number" value={vendorMetaDraft} onChange={e => setVendorMetaDraft(Number(e.target.value))} className="bg-secondary border-border/50 w-24 text-right" autoFocus onKeyDown={e => e.key === 'Enter' && handleSaveVendorMeta(v.id, v.nome)} />
                        <Button size="sm" variant="ghost" onClick={() => handleSaveVendorMeta(v.id, v.nome)}><Check className="w-3.5 h-3.5 text-green-500" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingVendorId(null)}><X className="w-3.5 h-3.5 text-red-400" /></Button>
                      </div>
                    ) : (
                      <span className="text-foreground">{vendorGoals.get(v.id) ?? v.meta} vendas</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <Input type="date" value={v.aniversario || ''} onChange={e => updateVendedor(v.id, { aniversario: e.target.value } as any)} className="bg-secondary border-border/50 w-36 text-xs h-8" />
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleStartEditVendor(v.id)}><Pencil className="w-3.5 h-3.5" /></Button>
                      {isAdmin && (
                        <Button variant="ghost" size="sm" onClick={async () => { const ok = await deleteVendedor(v.id); if (ok) { toast({ title: 'Excluído', description: `${v.nome} foi removido.` }); } else { toast({ title: 'Erro', description: `${v.nome} tem clientes vinculados.`, variant: 'destructive' }); } }}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Commission Tiers */}
      {isAdmin && tiers.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-foreground">Premiações por Nível</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Edite o valor da premiação para cada faixa de meta atingida. As % são fixas.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {tiers.map(t => (
              <div key={t.id} className="p-3 rounded-lg bg-secondary/30 border border-border/30 text-center">
                <p className="text-xs text-muted-foreground">{t.faixa_nome}</p>
                <p className="text-sm font-semibold text-foreground mb-2">{t.pct_meta}%</p>
                <div className="flex items-center gap-1 justify-center">
                  <span className="text-xs text-muted-foreground">R$</span>
                  <Input
                    type="number"
                    defaultValue={t.premiacao}
                    onBlur={e => {
                      const val = Number(e.target.value);
                      if (val !== t.premiacao && val >= 0) handleUpdateTierPremiacao(t.id, val);
                    }}
                    className="bg-secondary border-border/50 w-20 text-center text-sm h-8"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaign-Vendor Links */}
      {isAdmin && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Vínculos Campanha ↔ Vendedor</h2>
            </div>
            <Button size="sm" variant="outline" onClick={handleAutoDetect} disabled={campaignsLoading || metaCampaigns.length === 0}>
              <Wand2 className="w-4 h-4 mr-2" />
              Detectar Automaticamente
            </Button>
          </div>

          {/* Alert badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {unlinkedCampaigns > 0 && (
              <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-red-500/20 text-red-400">
                <AlertTriangle className="w-3 h-3" /> {unlinkedCampaigns} campanhas sem vendedor
              </span>
            )}
            {unlinkedVendors > 0 && (
              <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-400">
                <AlertTriangle className="w-3 h-3" /> {unlinkedVendors} vendedores sem campanha
              </span>
            )}
            {unlinkedCampaigns === 0 && unlinkedVendors === 0 && links.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-green-500/20 text-green-400">
                <CheckCircle2 className="w-3 h-3" /> Tudo vinculado
              </span>
            )}
          </div>

          {campaignsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando campanhas...
            </div>
          ) : metaCampaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhuma campanha encontrada. Configure o Meta Ads abaixo e sincronize.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b border-border/50">
                    <th className="text-left py-2 px-2">Campanha</th>
                    <th className="text-center py-2 px-2">Ativa</th>
                    <th className="text-left py-2 px-2 w-[180px]">Vendedor</th>
                    <th className="text-center py-2 px-2">Vínculo</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLinks.map(link => {
                    const campaign = metaCampaigns.find(c => c.id === link.campaign_id);
                    const isActive = campaign?.status === 'ACTIVE';
                    return (
                    <tr key={link.campaign_id} className="border-b border-border/30 hover:bg-secondary/50">
                      <td className="py-2 px-2">
                        <span className="text-foreground text-xs">{link.campaign_name}</span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-block w-2 h-2 rounded-full ${isActive ? 'bg-green-400' : 'bg-muted-foreground/40'}`} title={campaign?.status || 'Desconhecido'} />
                      </td>
                      <td className="py-2 px-2">
                        <Select
                          value={link.vendedor_id ? String(link.vendedor_id) : 'none'}
                          onValueChange={(val) => {
                            const vid = val === 'none' ? null : Number(val);
                            const vname = vid ? vendedores.find(v => v.id === vid)?.nome || null : null;
                            saveLink(link.campaign_id, link.campaign_name, vid, vname);
                          }}
                        >
                          <SelectTrigger className="w-[160px] bg-secondary border-border/50 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sem vínculo</SelectItem>
                            {vendedores.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 px-2 text-center">
                        {link.vendedor_id ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${link.is_manual_override ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                            {link.is_manual_override ? 'Manual' : 'Auto'}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Sem vínculo</span>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {isAdmin && <MetaAdsIntegration />}
    </div>
  );
}

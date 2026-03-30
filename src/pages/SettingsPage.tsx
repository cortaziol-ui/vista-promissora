import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MetaAdsIntegration from '@/components/MetaAdsIntegration';
import { useSalesData } from '@/contexts/SalesDataContext';
import { useAccountContext } from '@/contexts/AccountContext';
import { fetchCampaignInsights, type MetaCampaign } from '@/lib/metaAdsApi';
import { useCampaignLinks } from '@/hooks/useCampaignLinks';
import { matchAllCampaigns } from '@/lib/campaignMatcher';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, UserPlus, Check, X, Calendar, Loader2, Link2, Wand2, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
    vendedores, metaEmpresaVendas, setMetaEmpresaVendas,
    metaComercialVendas, setMetaComercialVendas,
    addVendedor, updateVendedor, deleteVendedor,
  } = useSalesData();
  const { activeAccount } = useAccountContext();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', monthlyGoal: 10 });

  // Month selector
  const currentMonth = new Date().toISOString().slice(5, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const year = new Date().getFullYear();
  const monthYM = `${year}-${selectedMonth}`;

  // Inline editing state
  const [editingMetaEmpresa, setEditingMetaEmpresa] = useState(false);
  const [metaEmpresaDraft, setMetaEmpresaDraft] = useState(metaEmpresaVendas);
  const [editingMetaComercial, setEditingMetaComercial] = useState(false);
  const [metaComercialDraft, setMetaComercialDraft] = useState(metaComercialVendas);
  const [editingVendorId, setEditingVendorId] = useState<number | null>(null);
  const [vendorMetaDraft, setVendorMetaDraft] = useState(0);

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

  const handleStartEditVendor = (id: number, currentMeta: number) => {
    setEditingVendorId(id);
    setVendorMetaDraft(currentMeta);
  };

  const handleSaveVendorMeta = (id: number, nome: string) => {
    if (vendorMetaDraft >= 0) {
      updateVendedor(id, { meta: vendorMetaDraft });
      toast({ title: 'Meta atualizada', description: `Meta de ${nome} alterada para ${vendorMetaDraft} vendas` });
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
    });
    if (result) {
      toast({ title: 'Vendedor adicionado', description: `${newUser.name} foi adicionado ao sistema.` });
    } else {
      toast({ title: 'Erro', description: 'Falha ao salvar vendedor.', variant: 'destructive' });
    }
    setDialogOpen(false);
    setNewUser({ name: '', email: '', monthlyGoal: 10 });
  };

  const somaMetasIndividuais = vendedores.reduce((s, v) => s + v.meta, 0);

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
                <th className="text-right py-3 px-2">Meta (vendas)</th>
                <th className="text-center py-3 px-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {vendedores.map(v => (
                <tr key={v.id} className="border-b border-border/30 hover:bg-secondary/50 transition-colors">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{v.avatar}</span>
                      <span className="text-foreground font-medium">{v.nome}</span>
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
                      <span className="text-foreground">{v.meta} vendas</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleStartEditVendor(v.id, v.meta)}><Pencil className="w-3.5 h-3.5" /></Button>
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
                    <th className="text-left py-2 px-2 w-[180px]">Vendedor</th>
                    <th className="text-center py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {links.map(link => (
                    <tr key={link.campaign_id} className="border-b border-border/30 hover:bg-secondary/50">
                      <td className="py-2 px-2">
                        <span className="text-foreground text-xs">{link.campaign_name}</span>
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
                  ))}
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

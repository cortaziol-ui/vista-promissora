import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getMetaConfig, saveMetaConfig, testConnection, fetchCampaignInsights, type MetaAdsConfig } from '@/lib/metaAdsApi';
import { Plug, CheckCircle2, XCircle, RefreshCw, Save, Wifi, Facebook } from 'lucide-react';

export default function MetaAdsIntegration() {
  const { toast } = useToast();
  const [config, setConfig] = useState<MetaAdsConfig>({
    accessToken: '',
    adAccountId: '',
    currency: 'BRL',
    timezone: 'America/Sao_Paulo',
    connected: false,
  });
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const saved = getMetaConfig();
    if (saved) setConfig(saved);
  }, []);

  const maskedToken = config.accessToken
    ? config.accessToken.slice(0, 10) + '••••••••' + config.accessToken.slice(-6)
    : '';

  const handleSave = () => {
    saveMetaConfig(config);
    toast({ title: 'Configuração salva', description: 'As credenciais do Meta Ads foram salvas localmente.' });
  };

  const handleTest = async () => {
    if (!config.accessToken) {
      toast({ title: 'Token vazio', description: 'Insira o Access Token primeiro.', variant: 'destructive' });
      return;
    }
    setTesting(true);
    try {
      const result = await testConnection(config.accessToken);
      if (result.success) {
        const updated = { ...config, connected: true };
        setConfig(updated);
        saveMetaConfig(updated);
        toast({ title: 'Conexão bem-sucedida!', description: `Conta: ${result.name}` });
      } else {
        const updated = { ...config, connected: false };
        setConfig(updated);
        saveMetaConfig(updated);
        toast({ title: 'Falha na conexão', description: result.error, variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Erro inesperado', variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    if (!config.accessToken || !config.adAccountId) {
      toast({ title: 'Campos incompletos', description: 'Preencha o Token e o Ad Account ID.', variant: 'destructive' });
      return;
    }
    setSyncing(true);
    try {
      const now = new Date();
      const since = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const until = now.toISOString().slice(0, 10);
      const result = await fetchCampaignInsights(config.accessToken, config.adAccountId, { since, until });
      if (result.error) {
        toast({ title: 'Erro na sincronização', description: result.error, variant: 'destructive' });
      } else {
        const updated = { ...config, lastSync: new Date().toISOString(), connected: true };
        setConfig(updated);
        saveMetaConfig(updated);
        toast({ title: 'Dados sincronizados!', description: `${result.campaigns.length} campanhas importadas.` });
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Erro inesperado', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[hsl(220,70%,55%)]/20 flex items-center justify-center">
            <Facebook className="w-5 h-5 text-[hsl(220,70%,55%)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Meta Ads</h2>
            <p className="text-xs text-muted-foreground">Facebook & Instagram Ads</p>
          </div>
        </div>
        <Badge variant={config.connected ? 'default' : 'secondary'} className={config.connected ? 'bg-green-600/20 text-green-400 border-green-600/30' : ''}>
          {config.connected ? (
            <><CheckCircle2 className="w-3 h-3 mr-1" /> Conectado</>
          ) : (
            <><XCircle className="w-3 h-3 mr-1" /> Desconectado</>
          )}
        </Badge>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Meta Access Token</label>
          <Textarea
            value={config.accessToken}
            onChange={e => setConfig({ ...config, accessToken: e.target.value })}
            placeholder="Cole seu Access Token aqui..."
            className="bg-secondary border-border/50 font-mono text-xs min-h-[80px]"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Gere em{' '}
            <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-[hsl(220,70%,55%)] underline">
              developers.facebook.com &gt; Tools &gt; Graph API Explorer
            </a>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Ad Account ID</label>
            <Input
              value={config.adAccountId}
              onChange={e => setConfig({ ...config, adAccountId: e.target.value })}
              placeholder="act_123456789"
              className="bg-secondary border-border/50"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Moeda</label>
            <Input
              value={config.currency}
              onChange={e => setConfig({ ...config, currency: e.target.value })}
              className="bg-secondary border-border/50"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Timezone</label>
            <Input
              value={config.timezone}
              onChange={e => setConfig({ ...config, timezone: e.target.value })}
              className="bg-secondary border-border/50"
            />
          </div>
        </div>

        {config.lastSync && (
          <p className="text-xs text-muted-foreground">
            Última sincronização: {new Date(config.lastSync).toLocaleString('pt-BR')}
          </p>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button onClick={handleSave} variant="outline" className="gap-2">
            <Save className="w-4 h-4" /> Salvar Conexão
          </Button>
          <Button onClick={handleTest} disabled={testing} variant="outline" className="gap-2">
            <Wifi className="w-4 h-4" /> {testing ? 'Testando...' : 'Testar Conexão'}
          </Button>
          <Button onClick={handleSync} disabled={syncing} className="gap-2 bg-[hsl(220,70%,55%)] hover:bg-[hsl(220,70%,48%)]">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
          </Button>
        </div>
      </div>
    </div>
  );
}

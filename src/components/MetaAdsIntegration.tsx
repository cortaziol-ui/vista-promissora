import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  Trash2,
  Star,
  Pencil,
  Check,
  X,
  Building2,
  RefreshCw,
} from "lucide-react";
import { useAccountContext, type MetaAccount } from "@/contexts/AccountContext";
import { testConnection, testAdAccount, fetchCampaignInsights } from "@/lib/metaAdsApi";

// ─── Token Section ────────────────────────────────────────────────────────────

function TokenSection({ activeAccountId }: { activeAccountId: string | null }) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!activeAccountId) return;
    supabase
      .from("app_settings")
      .select("value")
      .eq("account_id", activeAccountId)
      .eq("key", "meta_access_token")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setToken(data.value);
      });
  }, [activeAccountId]);

  async function handleSave() {
    if (!activeAccountId) return;
    setSaving(true);
    setStatus("idle");
    try {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "meta_access_token", value: token, account_id: activeAccountId } as any, { onConflict: "account_id,key" });
      if (error) throw new Error(error.message);
      setStatus("success");
      setMessage("Token salvo com sucesso.");
    } catch (e: any) {
      setStatus("error");
      setMessage("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <KeyRound className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">Access Token Meta</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Token único usado para todas as contas. Configure uma vez.</p>
      <div className="space-y-3">
        <div className="relative">
          <input
            type={showToken ? "text" : "password"}
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setStatus("idle");
              setMessage("");
            }}
            placeholder="EAAxxxxxxxxxxxxxxx..."
            className="w-full h-10 rounded-md border border-border/50 bg-secondary px-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {message && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${
              status === "success"
                ? "bg-green-600/10 border-green-600/30 text-green-400"
                : "bg-destructive/10 border-destructive/30 text-destructive"
            }`}
          >
            {status === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            {message}
          </div>
        )}

        <Button onClick={handleSave} disabled={saving || !token.trim()} variant="outline">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Salvando...
            </>
          ) : (
            "Salvar Token"
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Sync Section ─────────────────────────────────────────────────────────────

function SyncSection({ activeAccountId }: { activeAccountId: string | null }) {
  const { accounts } = useAccountContext();
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState<{ name: string; ok: boolean; msg: string }[]>([]);

  async function handleSync() {
    setSyncing(true);
    setResults([]);

    const { data: tokenData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("account_id", activeAccountId!)
      .eq("key", "meta_access_token")
      .maybeSingle();
    const accessToken = tokenData?.value;

    if (!accessToken) {
      setResults([{ name: "Erro", ok: false, msg: "Configure o Access Token antes de sincronizar." }]);
      setSyncing(false);
      return;
    }

    const now = new Date();
    const since = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const until = now.toISOString().slice(0, 10);

    const logs: { name: string; ok: boolean; msg: string }[] = [];

    for (const account of accounts) {
      try {
        const result = await fetchCampaignInsights(accessToken, account.ad_account_id, { since, until });
        if (result.error) throw new Error(result.error);
        logs.push({ name: account.name, ok: true, msg: `${result.campaigns.length} campanhas · ${account.ad_account_id}` });
      } catch (e: any) {
        logs.push({ name: account.name, ok: false, msg: e.message });
      }
    }

    setResults(logs);
    setSyncing(false);
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <RefreshCw className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">Sincronizar dados Meta</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Sincroniza campanhas do mês atual para todas as contas configuradas.
      </p>
      <Button onClick={handleSync} disabled={syncing || accounts.length === 0} variant="outline">
        {syncing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Sincronizando...
          </>
        ) : (
          "Sincronizar todas as contas"
        )}
      </Button>
      {results.length > 0 && (
        <div className="space-y-2 mt-4">
          {results.map((r, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 p-2.5 rounded-lg border text-sm ${
                r.ok
                  ? "bg-green-600/10 border-green-600/30 text-green-400"
                  : "bg-destructive/10 border-destructive/30 text-destructive"
              }`}
            >
              {r.ok ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-medium">{r.name}</span>
                <span className="ml-2 opacity-75">{r.msg}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Add Account Form ─────────────────────────────────────────────────────────

function AddAccountForm({ onAdded, activeAccountId }: { onAdded: () => void; activeAccountId: string | null }) {
  const { addAccount } = useAccountContext();
  const [accountId, setAccountId] = useState("");
  const [name, setName] = useState("");
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleTest() {
    setTesting(true);
    setStatus("idle");
    setMessage("");
    setTested(false);
    try {
      const { data: tokenData } = await supabase
        .from("app_settings")
        .select("value")
        .eq("account_id", activeAccountId!)
        .eq("key", "meta_access_token")
        .maybeSingle();
      const accessToken = tokenData?.value;
      if (!accessToken) throw new Error("Configure o Access Token antes de testar.");

      const result = await testAdAccount(accessToken, accountId);

      if (result.success) {
        setStatus("success");
        setTested(true);
        if (!name && result.name) setName(result.name);
        setMessage(`Conectado! ${result.name || accountId}`);
      } else {
        setStatus("error");
        setMessage(result.error || "Falha na conexão.");
      }
    } catch (e: any) {
      setStatus("error");
      setMessage(e.message);
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await addAccount(name.trim() || accountId, accountId);
      setAccountId("");
      setName("");
      setStatus("idle");
      setMessage("");
      setTested(false);
      onAdded();
    } catch (e: any) {
      setStatus("error");
      setMessage("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  const canTest = accountId.trim().length > 0;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Plus className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">Adicionar conta</h2>
      </div>
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Ad Account ID</label>
          <input
            type="text"
            value={accountId}
            onChange={(e) => {
              setAccountId(e.target.value);
              setStatus("idle");
              setTested(false);
            }}
            placeholder="act_xxxxxxxxxxxxxxxxx"
            className="w-full h-10 rounded-md border border-border/50 bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground">Formato: act_123456789</p>
        </div>

        {tested && (
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Nome da conta</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Marca X - Vendas"
              className="w-full h-10 rounded-md border border-border/50 bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        {message && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${
              status === "success"
                ? "bg-green-600/10 border-green-600/30 text-green-400"
                : "bg-destructive/10 border-destructive/30 text-destructive"
            }`}
          >
            {status === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            {message}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleTest} disabled={testing || !canTest} className="flex-1">
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Testando...
              </>
            ) : (
              "Testar Conexão"
            )}
          </Button>
          {tested && (
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                "Salvar Conta"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Account Row ──────────────────────────────────────────────────────────────

function AccountRow({
  account,
  onActivate,
  onDelete,
  onRename,
}: {
  account: MetaAccount;
  onActivate: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(account.name);
  const [activating, setActivating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleActivate() {
    setActivating(true);
    await onActivate();
    setActivating(false);
  }

  function handleRename() {
    if (nameVal.trim() && nameVal !== account.name) onRename(nameVal.trim());
    setEditing(false);
  }

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        account.is_active ? "border-primary/40 bg-primary/5" : "border-border/50 bg-secondary/30"
      }`}
    >
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") setEditing(false);
              }}
              className="flex-1 h-7 rounded border border-border/50 bg-secondary px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button onClick={handleRename} className="text-green-500 hover:text-green-400">
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setNameVal(account.name);
                setEditing(false);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-foreground truncate">{account.name}</span>
            {account.is_active && (
              <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase tracking-wide">
                Ativa
              </span>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground font-mono mt-0.5">{account.ad_account_id}</p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {!account.is_active && (
          <Button variant="outline" size="sm" onClick={handleActivate} disabled={activating} className="h-7 text-xs">
            {activating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <Star className="w-3 h-3 mr-1" />
                Ativar
              </>
            )}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setEditing(true)}
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={async () => {
            setDeleting(true);
            await onDelete();
          }}
          disabled={deleting}
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
        >
          {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MetaAdsIntegration() {
  const { activeAccountId } = useTenant();
  const { accounts, loading, switchAccount, deleteAccount, updateAccountName, reload } = useAccountContext();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Integração Meta Ads</h2>

      <TokenSection activeAccountId={activeAccountId} />

      <SyncSection activeAccountId={activeAccountId} />

      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">Contas Meta Ads</h3>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando...
          </div>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma conta adicionada ainda.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {accounts.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                onActivate={() => switchAccount(account.id)}
                onDelete={() => deleteAccount(account.id)}
                onRename={(name) => updateAccountName(account.id, name)}
              />
            ))}
          </div>
        )}
      </div>

      <AddAccountForm onAdded={reload} activeAccountId={activeAccountId} />
    </div>
  );
}

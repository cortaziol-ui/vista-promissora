import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

// Map Kommo pipeline status IDs to our status labels
const STATUS_MAP: Record<string, string> = {
  // These will be customizable per account later.
  // Default Kommo statuses:
  "142": "novo",           // Incoming leads
  "143": "em_atendimento", // In progress
  "successful": "ganho",
  "unsuccessful": "perdido",
};

function mapStatus(statusId: string | number): string {
  const key = String(statusId);
  return STATUS_MAP[key] || "novo";
}

interface KommoWebhookPayload {
  leads?: {
    add?: KommoLead[];
    update?: KommoLead[];
    status?: KommoLeadStatus[];
  };
  account?: { subdomain?: string };
}

interface KommoLead {
  id: number;
  name?: string;
  responsible_user_id?: number;
  status_id?: number;
  pipeline_id?: number;
  price?: number;
  custom_fields_values?: { field_id: number; field_name: string; values: { value: string }[] }[];
  contacts?: { id: number }[];
  created_at?: number;
  updated_at?: number;
}

interface KommoLeadStatus {
  id: number;
  status_id: number;
  pipeline_id: number;
  old_status_id?: number;
  old_pipeline_id?: number;
}

// Resolve account_id from Kommo subdomain
async function resolveAccount(subdomain: string): Promise<string | null> {
  // Look up in app_settings which account has this kommo_subdomain
  const { data } = await supabase
    .from("app_settings")
    .select("account_id")
    .eq("key", "kommo_subdomain")
    .eq("value", subdomain)
    .maybeSingle();
  return data?.account_id || null;
}

// Map Kommo responsible_user_id → local vendedor
async function resolveVendedor(
  kommoUserId: number,
  accountId: string
): Promise<{ vendedor_id: number; vendedor_nome: string } | null> {
  const { data } = await supabase
    .from("kommo_users")
    .select("vendedor_id, vendedores(nome)")
    .eq("account_id", accountId)
    .eq("kommo_user_id", kommoUserId)
    .maybeSingle();

  if (!data) return null;
  const vendedorNome = (data as any).vendedores?.nome || "";
  return { vendedor_id: data.vendedor_id, vendedor_nome: vendedorNome };
}

// Extract a custom field value by name (case-insensitive)
function extractCustomField(lead: KommoLead, fieldName: string): string | null {
  if (!lead.custom_fields_values) return null;
  const field = lead.custom_fields_values.find(
    (f) => f.field_name.toLowerCase() === fieldName.toLowerCase()
  );
  return field?.values?.[0]?.value || null;
}

// Fetch contact details from Kommo API to get phone/email
async function fetchContactDetails(
  contactId: number,
  accountId: string
): Promise<{ phone?: string; email?: string; name?: string }> {
  // Get Kommo token and subdomain from app_settings
  const { data: settings } = await supabase
    .from("app_settings")
    .select("key, value")
    .eq("account_id", accountId)
    .in("key", ["kommo_api_token", "kommo_subdomain"]);

  if (!settings || settings.length < 2) return {};

  const token = settings.find((s: any) => s.key === "kommo_api_token")?.value;
  const subdomain = settings.find((s: any) => s.key === "kommo_subdomain")?.value;
  if (!token || !subdomain) return {};

  try {
    const res = await fetch(
      `https://${subdomain}.kommo.com/api/v4/contacts/${contactId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) return {};
    const contact = await res.json();

    let phone: string | undefined;
    let email: string | undefined;
    const name = contact.name;

    for (const field of contact.custom_fields_values || []) {
      if (field.field_code === "PHONE") phone = field.values?.[0]?.value;
      if (field.field_code === "EMAIL") email = field.values?.[0]?.value;
    }

    return { phone, email, name };
  } catch {
    return {};
  }
}

async function handleLeadAdd(leads: KommoLead[], accountId: string) {
  for (const lead of leads) {
    const vendedor = lead.responsible_user_id
      ? await resolveVendedor(lead.responsible_user_id, accountId)
      : null;

    // Try to get contact info
    let phone: string | undefined;
    let email: string | undefined;
    let contactName: string | undefined;

    const contactId = lead.contacts?.[0]?.id;
    if (contactId) {
      const contact = await fetchContactDetails(contactId, accountId);
      phone = contact.phone;
      email = contact.email;
      contactName = contact.name;
    }

    const source = extractCustomField(lead, "utm_source") || extractCustomField(lead, "source");
    const campaignName = extractCustomField(lead, "utm_campaign") || extractCustomField(lead, "campaign");

    const { error } = await supabase.from("leads").upsert(
      {
        kommo_lead_id: lead.id,
        nome: contactName || lead.name || "",
        telefone: phone || "",
        email: email || "",
        vendedor_id: vendedor?.vendedor_id || null,
        vendedor_nome: vendedor?.vendedor_nome || "",
        source: source || "",
        campaign_name: campaignName || "",
        status: mapStatus(lead.status_id || 142),
        kommo_status: String(lead.status_id || ""),
        kommo_pipeline_id: lead.pipeline_id || null,
        valor: lead.price || 0,
        account_id: accountId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "account_id,kommo_lead_id" }
    );

    if (error) console.error("[kommo-webhook] upsert lead failed:", error);
  }
}

async function handleLeadUpdate(leads: KommoLead[], accountId: string) {
  for (const lead of leads) {
    const vendedor = lead.responsible_user_id
      ? await resolveVendedor(lead.responsible_user_id, accountId)
      : null;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (lead.name) updates.nome = lead.name;
    if (lead.status_id) {
      updates.status = mapStatus(lead.status_id);
      updates.kommo_status = String(lead.status_id);
    }
    if (lead.price !== undefined) updates.valor = lead.price;
    if (lead.pipeline_id) updates.kommo_pipeline_id = lead.pipeline_id;
    if (vendedor) {
      updates.vendedor_id = vendedor.vendedor_id;
      updates.vendedor_nome = vendedor.vendedor_nome;
    }

    const { error } = await supabase
      .from("leads")
      .update(updates)
      .eq("account_id", accountId)
      .eq("kommo_lead_id", lead.id);

    if (error) console.error("[kommo-webhook] update lead failed:", error);
  }
}

async function handleLeadStatus(statuses: KommoLeadStatus[], accountId: string) {
  for (const s of statuses) {
    const { error } = await supabase
      .from("leads")
      .update({
        status: mapStatus(s.status_id),
        kommo_status: String(s.status_id),
        kommo_pipeline_id: s.pipeline_id,
        updated_at: new Date().toISOString(),
      })
      .eq("account_id", accountId)
      .eq("kommo_lead_id", s.id);

    if (error) console.error("[kommo-webhook] status update failed:", error);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Kommo sends webhooks as form-urlencoded or JSON
    let payload: KommoWebhookPayload;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      // Kommo form-encoded webhooks have a specific structure
      // Parse the nested structure
      const params = new URLSearchParams(text);
      payload = {} as KommoWebhookPayload;

      // Reconstruct the leads object from form params
      const leadsAdd: KommoLead[] = [];
      const leadsUpdate: KommoLead[] = [];
      const leadsStatus: KommoLeadStatus[] = [];

      for (const [key, value] of params.entries()) {
        const addMatch = key.match(/^leads\[add\]\[(\d+)\]\[(\w+)\]$/);
        if (addMatch) {
          const idx = Number(addMatch[1]);
          const field = addMatch[2];
          if (!leadsAdd[idx]) leadsAdd[idx] = { id: 0 } as KommoLead;
          (leadsAdd[idx] as any)[field] = isNaN(Number(value)) ? value : Number(value);
        }

        const updateMatch = key.match(/^leads\[update\]\[(\d+)\]\[(\w+)\]$/);
        if (updateMatch) {
          const idx = Number(updateMatch[1]);
          const field = updateMatch[2];
          if (!leadsUpdate[idx]) leadsUpdate[idx] = { id: 0 } as KommoLead;
          (leadsUpdate[idx] as any)[field] = isNaN(Number(value)) ? value : Number(value);
        }

        const statusMatch = key.match(/^leads\[status\]\[(\d+)\]\[(\w+)\]$/);
        if (statusMatch) {
          const idx = Number(statusMatch[1]);
          const field = statusMatch[2];
          if (!leadsStatus[idx]) leadsStatus[idx] = { id: 0 } as KommoLeadStatus;
          (leadsStatus[idx] as any)[field] = Number(value);
        }

        if (key.match(/^account\[subdomain\]$/)) {
          if (!payload.account) payload.account = {};
          payload.account.subdomain = value;
        }
      }

      payload.leads = {};
      if (leadsAdd.length) payload.leads.add = leadsAdd.filter(Boolean);
      if (leadsUpdate.length) payload.leads.update = leadsUpdate.filter(Boolean);
      if (leadsStatus.length) payload.leads.status = leadsStatus.filter(Boolean);
    } else {
      payload = await req.json();
    }

    console.log("[kommo-webhook] Received:", JSON.stringify(payload).slice(0, 500));

    // Resolve account
    const subdomain = payload.account?.subdomain;
    if (!subdomain) {
      return new Response(
        JSON.stringify({ error: "Missing account subdomain" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accountId = await resolveAccount(subdomain);
    if (!accountId) {
      return new Response(
        JSON.stringify({ error: "Account not found for subdomain: " + subdomain }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process events
    if (payload.leads?.add?.length) {
      await handleLeadAdd(payload.leads.add, accountId);
    }
    if (payload.leads?.update?.length) {
      await handleLeadUpdate(payload.leads.update, accountId);
    }
    if (payload.leads?.status?.length) {
      await handleLeadStatus(payload.leads.status, accountId);
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[kommo-webhook] Error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

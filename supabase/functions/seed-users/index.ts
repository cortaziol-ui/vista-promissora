import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const USERS = [
  { email: "caio@empresa.com", password: "Pjw6y0Q", role: "admin", sellerName: null },
  { email: "cunha@empresa.com", password: "8lYG25M", role: "manager", sellerName: "Cunha" },
  { email: "bianca@empresa.com", password: "f5FhKep", role: "seller", sellerName: "Bianca" },
  { email: "nayra@empresa.com", password: "9LI86cb", role: "seller", sellerName: "Nayra" },
  { email: "lucas@empresa.com", password: "PiY82Jt", role: "seller", sellerName: "Lucas" },
  { email: "gustavo@empresa.com", password: "Gjnzy9V", role: "seller", sellerName: "Gustavo" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const results: { email: string; status: string; error?: string }[] = [];

  for (const user of USERS) {
    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u: any) => u.email === user.email);

    let userId: string;

    if (existing) {
      userId = existing.id;
      results.push({ email: user.email, status: "already_exists" });
    } else {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });

      if (error) {
        results.push({ email: user.email, status: "error", error: error.message });
        continue;
      }
      userId = data.user.id;
      results.push({ email: user.email, status: "created" });
    }

    // Upsert role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: user.role }, { onConflict: "user_id,role" });

    if (roleError) {
      results.push({ email: user.email, status: "role_error", error: roleError.message });
    }

    // Link vendedor if applicable
    if (user.sellerName) {
      await supabaseAdmin
        .from("vendedores")
        .update({ user_id: userId })
        .eq("nome", user.sellerName);
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

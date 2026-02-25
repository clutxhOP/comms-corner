import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getAuthUserId(req: Request, supabase: any): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;

  if (token.startsWith("pat_")) {
    const tokenHash = await sha256Hex(token);
    const nowIso = new Date().toISOString();
    const { data: pat, error } = await supabase
      .from("personal_access_tokens").select("id, user_id, expires_at, revoked_at")
      .eq("token_hash", tokenHash).is("revoked_at", null).maybeSingle();
    if (error || !pat) return null;
    if (pat.expires_at && pat.expires_at <= nowIso) return null;
    await supabase.from("personal_access_tokens").update({ last_used_at: nowIso }).eq("id", pat.id);
    return { userId: pat.user_id };
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return { userId: user.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const auth = await getAuthUserId(req, supabase);
    if (!auth) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", auth.userId);
    const userRoles = (roles || []).map((r: any) => r.role);
    const isAdmin = userRoles.includes("admin");

    // Read access: admin or ops; Write: admin only
    if (!isAdmin && !userRoles.includes("ops") && !userRoles.includes("dev")) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const method = req.method;
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (method === "GET") {
      const { data, error } = await supabase.from("crm_webhooks").select("*").order("created_at", { ascending: false });
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ data }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Write operations: admin only
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Only admins can modify webhooks" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (method === "POST") {
      const body = await req.json();
      if (!body.name || !body.url || !body.events) {
        return new Response(JSON.stringify({ error: "Missing required fields: name, url, events" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data, error } = await supabase.from("crm_webhooks").insert({
        name: body.name, url: body.url, events: body.events,
        secret: body.secret || null, created_by: auth.userId,
      }).select().single();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ data }), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (method === "PATCH") {
      if (!id) return new Response(JSON.stringify({ error: "Query parameter 'id' is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const body = await req.json();
      const updates: Record<string, unknown> = {};
      for (const f of ["name", "url", "events", "active", "secret"]) { if (body[f] !== undefined) updates[f] = body[f]; }
      const { data, error } = await supabase.from("crm_webhooks").update(updates).eq("id", id).select().single();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ data }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (method === "DELETE") {
      if (!id) return new Response(JSON.stringify({ error: "Query parameter 'id' is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { error } = await supabase.from("crm_webhooks").delete().eq("id", id);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

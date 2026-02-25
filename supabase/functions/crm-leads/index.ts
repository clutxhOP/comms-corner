import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getAuthUserId(req: Request, supabase: any): Promise<{ userId: string; authType: "jwt" | "pat" } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;

  if (token.startsWith("pat_")) {
    const tokenHash = await sha256Hex(token);
    const nowIso = new Date().toISOString();
    const { data: pat, error } = await supabase
      .from("personal_access_tokens")
      .select("id, user_id, expires_at, revoked_at")
      .eq("token_hash", tokenHash)
      .is("revoked_at", null)
      .maybeSingle();
    if (error || !pat) return null;
    if (pat.expires_at && pat.expires_at <= nowIso) return null;
    await supabase.from("personal_access_tokens").update({ last_used_at: nowIso }).eq("id", pat.id);
    return { userId: pat.user_id, authType: "pat" };
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return { userId: user.id, authType: "jwt" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const auth = await getAuthUserId(req, supabase);
    if (!auth) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check roles
    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", auth.userId);
    const userRoles = (roles || []).map((r: any) => r.role);
    const isAdmin = userRoles.includes("admin");
    const isOps = userRoles.includes("ops");
    const isDev = userRoles.includes("dev");

    if (!isAdmin && !isOps && !isDev) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const method = req.method;
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    // GET - List leads
    if (method === "GET") {
      let query = supabase.from("leads").select("*").order("created_at", { ascending: false });

      const stageId = url.searchParams.get("stage_id");
      const source = url.searchParams.get("source");
      const name = url.searchParams.get("name");

      if (stageId) query = query.eq("stage_id", stageId);
      if (source) query = query.eq("source", source);
      if (name) query = query.ilike("name", `%${name}%`);

      const { data, error } = await query;
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ data }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST - Create lead
    if (method === "POST") {
      const body = await req.json();
      if (!body.name) {
        return new Response(JSON.stringify({ error: "Missing required field: name" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase.from("leads").insert({
        name: body.name,
        profile_url: body.profile_url || null,
        whatsapp: body.whatsapp || null,
        website: body.website || null,
        stage_id: body.stage_id || null,
        source: body.source || null,
        value: body.value ?? 0,
        metadata: body.metadata || {},
        created_by: auth.userId,
        updated_by: auth.userId,
      }).select().single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ data }), {
        status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PATCH - Update lead
    if (method === "PATCH") {
      if (!id) {
        return new Response(JSON.stringify({ error: "Query parameter 'id' is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const updates: Record<string, unknown> = { updated_by: auth.userId };
      const allowedFields = ["name", "profile_url", "whatsapp", "website", "stage_id", "source", "value", "metadata"];
      for (const field of allowedFields) {
        if (body[field] !== undefined) updates[field] = body[field];
      }

      const { data, error } = await supabase.from("leads").update(updates).eq("id", Number(id)).select().single();
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ data }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE - Admin only
    if (method === "DELETE") {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Only admins can delete leads" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!id) {
        return new Response(JSON.stringify({ error: "Query parameter 'id' is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase.from("leads").delete().eq("id", Number(id));
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

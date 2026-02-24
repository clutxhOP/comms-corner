import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth client to verify user
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // Check admin/ops role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const userRoles = (roles || []).map((r: { role: string }) => r.role);
    if (!userRoles.includes("admin") && !userRoles.includes("ops")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const method = req.method;

    // GET - list follow-ups
    if (method === "GET") {
      const url = new URL(req.url);
      const leadId = url.searchParams.get("lead_id");

      let query = adminClient
        .from("crm_follow_ups")
        .select("*")
        .order("scheduled_at", { ascending: true });

      if (leadId) {
        query = query.eq("lead_id", parseInt(leadId));
      }

      const { data, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ follow_ups: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST - create follow-up
    if (method === "POST") {
      const body = await req.json();
      const { lead_id, title, notes, scheduled_at } = body;

      if (!lead_id || !title || !scheduled_at) {
        return new Response(
          JSON.stringify({ error: "lead_id, title, and scheduled_at are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await adminClient.from("crm_follow_ups").insert({
        lead_id,
        title,
        notes: notes || null,
        scheduled_at,
        created_by: userId,
      }).select().single();

      if (error) throw error;

      return new Response(JSON.stringify({ follow_up: data }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PATCH - complete follow-up
    if (method === "PATCH") {
      const body = await req.json();
      const { id } = body;

      if (!id) {
        return new Response(
          JSON.stringify({ error: "id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await adminClient
        .from("crm_follow_ups")
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          completed_by: userId,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ follow_up: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

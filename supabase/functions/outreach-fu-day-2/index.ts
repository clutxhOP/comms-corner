import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABLE_NAME = "outreach_fu_day_2";
const TAB_LABEL = "Day 2";

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
    const { data: pat, error: patError } = await supabase
      .from("personal_access_tokens")
      .select("id, user_id, expires_at, revoked_at")
      .eq("token_hash", tokenHash)
      .is("revoked_at", null)
      .maybeSingle();
    if (patError || !pat) return null;
    if (pat.expires_at && pat.expires_at <= nowIso) return null;
    await supabase.from("personal_access_tokens").update({ last_used_at: nowIso }).eq("id", pat.id);
    return { userId: pat.user_id as string, authType: "pat" };
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return null;
  return { userId: user.id, authType: "jwt" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const auth = await getAuthUserId(req, supabase);
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { name, proof, created_at } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > 500) {
      return new Response(JSON.stringify({ error: "name is required (max 500 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!proof || typeof proof !== "string" || proof.trim().length === 0 || proof.length > 2000) {
      return new Response(JSON.stringify({ error: "proof is required (max 2000 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const insertData: Record<string, unknown> = { name: name.trim(), proof: proof.trim() };
    if (created_at) insertData.created_at = created_at;

    const { data: record, error: insertError } = await supabase
      .from(TABLE_NAME)
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get submitter name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", auth.userId)
      .maybeSingle();
    const submitterName = profile?.full_name || "Unknown";

    // Send OPS notification
    const isUrl = /^https?:\/\//i.test(proof.trim());
    const proofDisplay = isUrl ? `<a href="${proof.trim()}">${proof.trim()}</a>` : proof.trim();

    try {
      await fetch(`${supabaseUrl}/functions/v1/send-task-notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          taskId: String(record.id),
          taskTitle: `New Outreach FU: ${name.trim()}`,
          taskType: "outreach-fu",
          description: `Tab: ${TAB_LABEL} | Name: ${name.trim()} | Proof: ${proofDisplay} | Submitted by: ${submitterName} | Time: ${new Date().toISOString()}`,
          departmentEmails: ["ops@backendglamor.com"],
        }),
      });
    } catch (e) {
      console.error("Failed to send OPS notification:", e);
    }

    return new Response(JSON.stringify(record), {
      status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

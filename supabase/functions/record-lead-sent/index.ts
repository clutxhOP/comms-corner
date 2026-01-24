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

    const { data: pat, error: patError } = await supabase
      .from("personal_access_tokens")
      .select("id, user_id, expires_at, revoked_at")
      .eq("token_hash", tokenHash)
      .is("revoked_at", null)
      .maybeSingle();

    if (patError || !pat) return null;
    if (pat.expires_at && pat.expires_at <= nowIso) return null;

    await supabase
      .from("personal_access_tokens")
      .update({ last_used_at: nowIso })
      .eq("id", pat.id);

    return { userId: pat.user_id as string, authType: "pat" };
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return null;

  return { userId: user.id, authType: "jwt" };
}

interface RecordLeadPayload {
  customer_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const auth = await getAuthUserId(req, supabase);
    if (!auth) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const userId = auth.userId;

    const payload: RecordLeadPayload = await req.json();

    if (!payload.customer_id) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required field",
          required: {
            customer_id: "uuid - The customer ID to record a lead for"
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current customer data
    const { data: customer, error: fetchError } = await supabase
      .from("customers")
      .select("id, total_leads_sent")
      .eq("id", payload.customer_id)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching customer:", fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!customer) {
      return new Response(
        JSON.stringify({ error: "Customer not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update customer with incremented lead count and timestamp
    const { data, error } = await supabase
      .from("customers")
      .update({
        total_leads_sent: customer.total_leads_sent + 1,
        last_lead_sent_at: new Date().toISOString(),
      })
      .eq("id", payload.customer_id)
      .select()
      .single();

    if (error) {
      console.error("Error updating customer:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Lead recorded for customer:", payload.customer_id, "by user:", userId, "new total:", data.total_leads_sent);

    return new Response(
      JSON.stringify({ 
        data,
        message: `Lead recorded. Total leads sent: ${data.total_leads_sent}` 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

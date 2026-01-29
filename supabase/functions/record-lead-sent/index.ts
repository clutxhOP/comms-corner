import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// External Supabase project for businesses table
const EXTERNAL_SUPABASE_URL = "https://ycjyrjacwhnvulwzbzxw.supabase.co";
const EXTERNAL_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljanlyamFjd2hudnVsd3pienh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTA1MjYsImV4cCI6MjA3NzkyNjUyNn0.1CeeTzkiwSIQUqvu-hqGyr4e_nfz5YYXMcq2bXfKXdI";

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
    // Use internal Supabase for auth validation
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const internalSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const auth = await getAuthUserId(req, internalSupabase);
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
            customer_id: "uuid - The customer ID to lookup"
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Connect to external Supabase for businesses table
    const externalSupabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY);

    // Get business data from external database (read-only)
    const { data: business, error: fetchError } = await externalSupabase
      .from("businesses")
      .select("id, name, whatsapp, num_of_leads, lastLeadsentat")
      .eq("id", payload.customer_id)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching business:", fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!business) {
      return new Response(
        JSON.stringify({ error: "Customer not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle null values
    const totalLeadsSent = business.num_of_leads ?? 0;
    const lastLeadSentAt = business.lastLeadsentat ?? null;

    console.log("Business lookup for customer:", payload.customer_id, "by user:", userId, "total leads:", totalLeadsSent);

    // Return response with mapped field names for API consistency
    return new Response(
      JSON.stringify({ 
        data: {
          id: business.id,
          name: business.name,
          email: business.whatsapp,
          total_leads_sent: totalLeadsSent,
          last_lead_sent_at: lastLeadSentAt,
        },
        message: `Lead recorded. Total leads sent: ${totalLeadsSent}` 
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

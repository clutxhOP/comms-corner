import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a secure random token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Hash a token using SHA-256
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user's JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin or dev
    const { data: roleCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "dev"])
      .limit(1);

    const isAdminOrDev = roleCheck && roleCheck.length > 0;
    const isAdmin = roleCheck?.some(r => r.role === "admin") || false;

    if (!isAdminOrDev) {
      return new Response(
        JSON.stringify({ error: "Only admins and developers can manage personal access tokens" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const method = req.method;
    const url = new URL(req.url);
    const tokenId = url.searchParams.get("id");
    const userId = url.searchParams.get("user_id");

    // GET - List tokens
    if (method === "GET") {
      let query = supabase
        .from("personal_access_tokens")
        .select("id, user_id, name, token_prefix, last_used_at, expires_at, revoked_at, created_at")
        .is("revoked_at", null)
        .order("created_at", { ascending: false });

      // Admins can see all tokens, devs only their own
      if (!isAdmin) {
        query = query.eq("user_id", user.id);
      } else if (userId) {
        // Admin filtering by specific user
        query = query.eq("user_id", userId);
      }
      // If admin and no userId filter, return ALL tokens (no filter added)

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching tokens:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Fetched ${data?.length || 0} tokens for user ${user.id} (isAdmin: ${isAdmin})`);

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST - Create new PAT
    if (method === "POST") {
      let payload: { name?: string; expires_at?: string } = {};
      try {
        payload = await req.json();
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid JSON body" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (!payload.name) {
        return new Response(
          JSON.stringify({ error: "Token name is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate token
      const rawToken = `pat_${generateToken()}`;
      const tokenHash = await hashToken(rawToken);
      const tokenPrefix = rawToken.slice(0, 12);

      const { data, error } = await supabase
        .from("personal_access_tokens")
        .insert({
          user_id: user.id,
          name: payload.name,
          token_hash: tokenHash,
          token_prefix: tokenPrefix,
          expires_at: payload.expires_at || null,
        })
        .select("id, name, token_prefix, created_at")
        .single();

      if (error) {
        console.error("Error creating token:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("PAT created:", data.id, "for user:", user.id);

      // Return the full token ONLY on creation
      return new Response(
        JSON.stringify({ 
          data: {
            ...data,
            token: rawToken, // This is the ONLY time the full token is returned
          },
          message: "Save this token securely. It will not be shown again."
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE/PATCH - Revoke token
    if (method === "DELETE" || method === "PATCH") {
      if (!tokenId) {
        return new Response(
          JSON.stringify({ error: "Token ID required as query parameter: ?id=<uuid>" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get the token to check ownership
      const { data: existingToken } = await supabase
        .from("personal_access_tokens")
        .select("user_id")
        .eq("id", tokenId)
        .single();

      if (!existingToken) {
        return new Response(
          JSON.stringify({ error: "Token not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Only admin or token owner can revoke
      if (!isAdmin && existingToken.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "You can only revoke your own tokens" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Revoke the token (soft delete)
      const { error } = await supabase
        .from("personal_access_tokens")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", tokenId);

      if (error) {
        console.error("Error revoking token:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("PAT revoked:", tokenId, "by user:", user.id);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendMessagePayload {
  channelId: string;
  message: string;
  sender: string;
}

async function verifyAdminOrDevAccess(supabase: any, authHeader: string): Promise<{ userId: string | null; error: string | null }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { userId: null, error: "Missing or invalid Authorization header" };
  }

  const token = authHeader.replace('Bearer ', '');

  // Check if it's a PAT (Personal Access Token)
  if (token.startsWith('pat_')) {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const { data: patData, error: patError } = await supabase
      .from('personal_access_tokens')
      .select('user_id, expires_at, revoked_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (patError || !patData) {
      return { userId: null, error: "Invalid personal access token" };
    }

    if (patData.revoked_at) {
      return { userId: null, error: "Token has been revoked" };
    }

    if (patData.expires_at && new Date(patData.expires_at) < new Date()) {
      return { userId: null, error: "Token has expired" };
    }

    // Update last_used_at
    await supabase
      .from('personal_access_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('token_hash', tokenHash);

    // Check if user has admin or dev role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', patData.user_id);

    const hasAdminOrDev = roles?.some((r: any) => r.role === 'admin' || r.role === 'dev');
    if (!hasAdminOrDev) {
      return { userId: null, error: "Access denied. Requires admin or dev role." };
    }

    return { userId: patData.user_id, error: null };
  }

  // JWT authentication
  const supabaseWithAuth = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: claimsData, error: claimsError } = await supabaseWithAuth.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return { userId: null, error: "Invalid JWT token" };
  }

  const userId = claimsData.claims.sub as string;

  // Check if user has admin or dev role
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  const hasAdminOrDev = roles?.some((r: any) => r.role === 'admin' || r.role === 'dev');
  if (!hasAdminOrDev) {
    return { userId: null, error: "Access denied. Requires admin or dev role." };
  }

  return { userId, error: null };
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

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed. Use POST." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify admin/dev access
    const authHeader = req.headers.get("Authorization") || "";
    const { userId, error: authError } = await verifyAdminOrDevAccess(supabase, authHeader);

    if (authError) {
      return new Response(
        JSON.stringify({ success: false, error: authError }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: SendMessagePayload = await req.json();

    // Validate required fields
    if (!payload.channelId || !payload.message || !payload.sender) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields",
          required: {
            channelId: "string - channel ID or slug (e.g., 'main', 'dev', 'ops')",
            message: "string - supports plain text, URLs, markdown, and HTML",
            sender: "string - display name for the sender"
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate message is not empty
    if (!payload.message.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "Message cannot be empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find channel by ID or slug
    let channelId = payload.channelId;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(payload.channelId)) {
      // It's a slug, look up the channel
      const { data: channel, error: channelError } = await supabase
        .from("chat_channels")
        .select("id")
        .eq("slug", payload.channelId.toLowerCase())
        .maybeSingle();

      if (channelError || !channel) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Channel not found: ${payload.channelId}`,
            hint: "Use a valid channel ID or slug (main, dev, ops)"
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      channelId = channel.id;
    } else {
      // Validate that the UUID channel exists
      const { data: channel, error: channelError } = await supabase
        .from("chat_channels")
        .select("id")
        .eq("id", channelId)
        .maybeSingle();

      if (channelError || !channel) {
        return new Response(
          JSON.stringify({ success: false, error: `Channel not found: ${payload.channelId}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Use the authenticated user's ID as the sender
    const { data: messageData, error: insertError } = await supabase
      .from("chat_messages")
      .insert({
        channel_id: channelId,
        user_id: userId,
        content: payload.message,
        sender_name: payload.sender,
      })
      .select("id, channel_id, created_at")
      .single();

    if (insertError) {
      console.error("Error inserting message:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Channel message sent:", messageData.id, "to channel:", channelId, "from:", payload.sender, "by user:", userId);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: messageData.id,
        channelId: messageData.channel_id,
        sender: payload.sender,
        createdAt: messageData.created_at,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

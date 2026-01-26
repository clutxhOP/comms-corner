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

    // Create a system message by using a special format
    // Since we don't have a user_id for external sources, we'll create a system user
    // or use the service role to insert directly with a formatted message
    
    // First, check if we have a system user for external messages
    let systemUserId: string;
    
    const { data: systemProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", "system@backendglamor.com")
      .maybeSingle();

    if (systemProfile) {
      systemUserId = systemProfile.user_id;
    } else {
      // Use service role to insert - we'll format the message with sender prefix
      // For now, we'll need to create a workaround by using a special format
      // that includes the sender name in the message content
      
      // Get any admin user to use as the system sender
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .limit(1)
        .maybeSingle();

      if (!adminRole) {
        return new Response(
          JSON.stringify({ success: false, error: "No admin user found for system messages" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      systemUserId = adminRole.user_id;
    }

    // Format message with sender prefix for external messages
    const formattedMessage = `[${payload.sender}] ${payload.message}`;

    // Insert the message
    const { data: messageData, error: insertError } = await supabase
      .from("chat_messages")
      .insert({
        channel_id: channelId,
        user_id: systemUserId,
        content: formattedMessage,
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

    console.log("Channel message sent:", messageData.id, "to channel:", channelId, "from:", payload.sender);

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

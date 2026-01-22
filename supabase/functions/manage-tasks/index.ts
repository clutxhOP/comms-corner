import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TaskPayload {
  type: "lead-approval" | "lead-alert" | "lead-outreach" | "other";
  title: string;
  assigned_to?: string; // Profile ID of the user
  details?: Record<string, unknown>;
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

    // Check if user is admin
    const { data: adminCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const isAdmin = !!adminCheck;

    const method = req.method;
    const url = new URL(req.url);
    const taskId = url.searchParams.get("id");

    // GET - Fetch tasks
    if (method === "GET") {
      let query = supabase.from("tasks").select("*").order("created_at", { ascending: false });

      // Non-admins can only see tasks assigned to them or unassigned
      if (!isAdmin) {
        query = query.or(`assigned_to.eq.${user.id},assigned_to.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching tasks:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST - Create task (admin only)
    if (method === "POST") {
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Only admins can create tasks" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const payload: TaskPayload = await req.json();

      // Validate required fields
      if (!payload.type || !payload.title) {
        return new Response(
          JSON.stringify({ 
            error: "Missing required fields",
            required: {
              type: "lead-approval | lead-alert | lead-outreach | other",
              title: "string"
            },
            optional: {
              assigned_to: "Profile ID (uuid)",
              details: "object - varies by task type"
            }
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate task type
      const validTypes = ["lead-approval", "lead-alert", "lead-outreach", "other"];
      if (!validTypes.includes(payload.type)) {
        return new Response(
          JSON.stringify({ 
            error: `Invalid task type. Must be one of: ${validTypes.join(", ")}`
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          type: payload.type,
          title: payload.title,
          assigned_to: payload.assigned_to || null,
          details: payload.details || {},
          created_by: user.id,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating task:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Task created:", data.id, "by user:", user.id);

      return new Response(
        JSON.stringify({ data }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE - Delete task (admin only)
    if (method === "DELETE") {
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Only admins can delete tasks" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!taskId) {
        return new Response(
          JSON.stringify({ error: "Task ID required as query parameter: ?id=<uuid>" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase.from("tasks").delete().eq("id", taskId);

      if (error) {
        console.error("Error deleting task:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Task deleted:", taskId, "by user:", user.id);

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

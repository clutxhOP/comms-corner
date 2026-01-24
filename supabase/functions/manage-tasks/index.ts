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

  // PAT authentication
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

    // Best-effort update
    await supabase
      .from("personal_access_tokens")
      .update({ last_used_at: nowIso })
      .eq("id", pat.id);

    return { userId: pat.user_id as string, authType: "pat" };
  }

  // JWT authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return null;

  return { userId: user.id, authType: "jwt" };
}

interface TaskPayload {
  type: "lead-approval" | "lead-alert" | "lead-outreach" | "error-alert" | "other";
  title: string;
  assigned_to?: string | string[]; // Can be email(s), profile ID(s), or department email
  details?: Record<string, unknown>;
}

// Define required fields for each task type
const requiredFields: Record<string, string[]> = {
  "lead-approval": ["clientId", "category", "icp", "requirement", "contactInfo", "proofLink"],
  "lead-alert": ["clientName", "category", "whatsapp", "clientStatus", "alertLevel", "issue", "timeSinceLastLead"],
  "lead-outreach": ["requirement", "contactInfo", "post", "comment"],
  "error-alert": ["error", "url"],
  "other": ["description"],
};

// Department email to role mapping
const departmentEmails: Record<string, string> = {
  "ops@backendglamor.com": "ops",
  "dev@backendglamor.com": "dev",
  "admin@backendglamor.com": "admin",
};

function validateDetails(type: string, details: Record<string, unknown> | undefined): { valid: boolean; missing: string[] } {
  const required = requiredFields[type] || [];
  if (!details) {
    return { valid: required.length === 0, missing: required };
  }
  
  const missing: string[] = [];
  for (const field of required) {
    if (details[field] === undefined || details[field] === null || details[field] === "") {
      missing.push(field);
    }
  }
  
  return { valid: missing.length === 0, missing };
}

// Resolve assignees from email(s) to user IDs
async function resolveAssignees(
  supabase: any,
  assignedTo: string | string[] | undefined
): Promise<string[]> {
  if (!assignedTo) return [];
  
  const inputs = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
  const userIds: string[] = [];
  
  for (const input of inputs) {
    // Check if it's a department email
    const role = departmentEmails[input.toLowerCase()];
    if (role) {
      // Get all users with this role
      const { data: roleUsers } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", role);
      
      if (roleUsers && Array.isArray(roleUsers)) {
        for (const r of roleUsers) {
          userIds.push(r.user_id as string);
        }
      }
      continue;
    }
    
    // Check if it's a UUID (profile ID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(input)) {
      userIds.push(input);
      continue;
    }
    
    // Try to find user by email
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", input.toLowerCase())
      .maybeSingle();
    
    if (profile && profile.user_id) {
      userIds.push(profile.user_id as string);
    }
  }
  
  // Remove duplicates
  return [...new Set(userIds)];
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

    const auth = await getAuthUserId(req, supabase);
    if (!auth) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const userId = auth.userId;

    // Check if user is admin or dev
    const { data: roleCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "dev"])
      .limit(1);

    const isAdminOrDev = roleCheck && roleCheck.length > 0;

    const method = req.method;
    const url = new URL(req.url);
    const taskId = url.searchParams.get("id");

    // GET - Fetch tasks
    if (method === "GET") {
      let query = supabase.from("tasks").select("*").order("created_at", { ascending: false });

      // Non-admins/devs can only see tasks assigned to them or unassigned
      if (!isAdminOrDev) {
        query = query.or(`assigned_to.cs.{${userId}},assigned_to.is.null`);
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

    // POST - Create task (admin or dev only)
    if (method === "POST") {
      if (!isAdminOrDev) {
        return new Response(
          JSON.stringify({ error: "Only admins and developers can create tasks" }),
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
              title: "string",
              details: "object - required fields depend on task type"
            },
            optional: {
              assigned_to: "Email, Profile ID, Department email (e.g., ops@backendglamor.com), or array of these"
            }
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate task type
      const validTypes = ["lead-approval", "lead-alert", "lead-outreach", "error-alert", "other"];
      if (!validTypes.includes(payload.type)) {
        return new Response(
          JSON.stringify({ 
            error: `Invalid task type. Must be one of: ${validTypes.join(", ")}`
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate details based on task type
      const validation = validateDetails(payload.type, payload.details);
      if (!validation.valid) {
        const detailsSchema: Record<string, object> = {
          "lead-approval": {
            clientId: "string (required)",
            category: "string (required)",
            icp: "string (required)",
            requirement: "string (required)",
            contactInfo: "string (required)",
            proofLink: "string (required)"
          },
          "lead-alert": {
            clientName: "string (required)",
            category: "string (required)",
            whatsapp: "string (required)",
            clientStatus: "string (required)",
            alertLevel: "yellow | red (required)",
            issue: "string (required)",
            timeSinceLastLead: "string (required)"
          },
          "lead-outreach": {
            requirement: "string (required)",
            contactInfo: "string (required)",
            post: "string (required)",
            comment: "string (required)"
          },
          "error-alert": {
            error: "string (required)",
            url: "string (required)"
          },
          "other": {
            description: "string (required)",
            notes: "string (optional)"
          }
        };

        return new Response(
          JSON.stringify({ 
            error: "Missing required fields in details",
            missing_fields: validation.missing,
            required_schema: detailsSchema[payload.type]
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Resolve assignees from emails/IDs/department emails
      const resolvedAssignees = await resolveAssignees(supabase, payload.assigned_to);

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          type: payload.type,
          title: payload.title,
          assigned_to: resolvedAssignees.length > 0 ? resolvedAssignees : null,
          details: payload.details || {},
          created_by: userId,
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

      console.log("Task created:", data.id, "by user:", userId, "assigned_to:", resolvedAssignees);

      return new Response(
        JSON.stringify({ data }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PATCH - Update task assignment (admin or dev only)
    if (method === "PATCH") {
      if (!isAdminOrDev) {
        return new Response(
          JSON.stringify({ error: "Only admins and developers can update task assignments" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!taskId) {
        return new Response(
          JSON.stringify({ error: "Task ID required as query parameter: ?id=<uuid>" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const payload = await req.json();
      
      // Resolve assignees from emails/IDs/department emails
      const resolvedAssignees = await resolveAssignees(supabase, payload.assigned_to);

      const { data, error } = await supabase
        .from("tasks")
        .update({
          assigned_to: resolvedAssignees.length > 0 ? resolvedAssignees : null,
        })
        .eq("id", taskId)
        .select()
        .single();

      if (error) {
        console.error("Error updating task:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Task updated:", taskId, "assigned_to:", resolvedAssignees);

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE - Delete task (admin or dev only)
    if (method === "DELETE") {
      if (!isAdminOrDev) {
        return new Response(
          JSON.stringify({ error: "Only admins and developers can delete tasks" }),
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

      console.log("Task deleted:", taskId, "by user:", userId);

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
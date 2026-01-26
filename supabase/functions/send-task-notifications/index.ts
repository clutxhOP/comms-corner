import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  taskId: string;
  taskTitle: string;
  taskType: string;
  description?: string;
  departmentEmails: string[]; // e.g., ['dev@backendglamor.com', 'ops@backendglamor.com']
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NotificationPayload = await req.json();

    if (!payload.taskId || !payload.taskTitle || !payload.taskType) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all users in the specified departments
    const departmentRoles: string[] = [];
    for (const email of payload.departmentEmails || []) {
      if (email.includes('dev@')) departmentRoles.push('dev');
      if (email.includes('ops@')) departmentRoles.push('ops');
      if (email.includes('admin@')) departmentRoles.push('admin');
    }

    if (departmentRoles.length === 0) {
      console.log("No department roles specified, skipping email notifications");
      return new Response(
        JSON.stringify({ success: true, message: "No department emails to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get users with the specified roles
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('role', departmentRoles);

    if (rolesError) {
      console.error("Error fetching user roles:", rolesError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch users" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userIds = [...new Set(userRoles?.map(ur => ur.user_id) || [])];

    if (userIds.length === 0) {
      console.log("No users found in specified departments");
      return new Response(
        JSON.stringify({ success: true, message: "No users to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user emails from profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .in('user_id', userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch user emails" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emails = profiles?.map(p => p.email).filter(Boolean) || [];

    if (emails.length === 0) {
      console.log("No email addresses found");
      return new Response(
        JSON.stringify({ success: true, message: "No email addresses to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get task type display name
    const taskTypeDisplay = payload.taskType
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    // Send email to all users
    const emailResult = await resend.emails.send({
      from: "Task Alerts <alerts@backendglamor.com>",
      to: emails,
      subject: `🔔 New ${taskTypeDisplay}: ${payload.taskTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 15px; }
            .badge-alert { background: #fee2e2; color: #dc2626; }
            .badge-approval { background: #dbeafe; color: #2563eb; }
            .badge-outreach { background: #d1fae5; color: #059669; }
            .badge-other { background: #e5e7eb; color: #374151; }
            .title { font-size: 20px; font-weight: 600; color: #1f2937; margin-bottom: 15px; }
            .description { color: #6b7280; line-height: 1.6; margin-bottom: 20px; }
            .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
            .footer { padding: 20px 30px; background: #f9fafb; text-align: center; color: #9ca3af; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 New Task Alert</h1>
            </div>
            <div class="content">
              <span class="badge badge-${payload.taskType === 'error-alert' ? 'alert' : payload.taskType === 'lead-approval' ? 'approval' : payload.taskType === 'lead-outreach' ? 'outreach' : 'other'}">${taskTypeDisplay}</span>
              <h2 class="title">${payload.taskTitle}</h2>
              ${payload.description ? `<p class="description">${payload.description}</p>` : ''}
              <a href="https://comms-corner.lovable.app/tasks" class="button">View Task</a>
            </div>
            <div class="footer">
              <p>You're receiving this because you're a member of the ${departmentRoles.join(', ')} department(s).</p>
              <p>Backend Glamor Task Management System</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (emailResult.error) {
      console.error("Error sending email:", emailResult.error);
      return new Response(
        JSON.stringify({ success: false, error: emailResult.error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Notification emails sent to:", emails.length, "users for task:", payload.taskId);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent: emails.length,
        recipients: emails,
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

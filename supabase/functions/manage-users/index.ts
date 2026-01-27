import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Invalid authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if caller is admin
    const { data: callerRoles } = await anonClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const isAdmin = callerRoles?.some((r) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client for user operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const method = req.method;

    // DELETE - Remove user completely (auth record + cascade)
    if (method === "DELETE") {
      const { userId } = await req.json();

      if (!userId || typeof userId !== "string") {
        return new Response(JSON.stringify({ error: "userId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete auth user (this will cascade delete profiles/roles via foreign keys if set up)
      // First manually delete dependent data if no cascade
      await adminClient.from("user_roles").delete().eq("user_id", userId);
      await adminClient.from("profiles").delete().eq("user_id", userId);
      await adminClient.from("personal_access_tokens").delete().eq("user_id", userId);

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

      if (deleteError) {
        console.error("Error deleting user:", deleteError);
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST - Create new user
    if (method === "POST") {
      const { email, password, fullName, roles } = await req.json();

      if (!email || !password || !fullName) {
        return new Response(JSON.stringify({ error: "email, password, and fullName are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate inputs
      if (password.length < 6) {
        return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (createError) {
        console.error("Error creating user:", createError);
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Profile is auto-created via trigger, but update full_name just in case
      if (newUser.user) {
        await adminClient
          .from("profiles")
          .update({ full_name: fullName })
          .eq("user_id", newUser.user.id);

        // Add roles
        if (Array.isArray(roles) && roles.length > 0) {
          for (const role of roles) {
            await adminClient.from("user_roles").insert({ user_id: newUser.user.id, role });
          }
        }
      }

      return new Response(JSON.stringify({ success: true, user: { id: newUser.user?.id, email } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PATCH - Reset password
    if (method === "PATCH") {
      const { userId, newPassword } = await req.json();

      if (!userId || !newPassword) {
        return new Response(JSON.stringify({ error: "userId and newPassword are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (newPassword.length < 6) {
        return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (updateError) {
        console.error("Error resetting password:", updateError);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

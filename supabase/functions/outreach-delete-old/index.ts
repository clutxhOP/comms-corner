import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface DeleteOldPayload {
  days_old: number;
  platform?: 'reddit' | 'linkedin' | 'X';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: DeleteOldPayload = await req.json();

    console.log('Received payload:', JSON.stringify(payload));

    // Validate days_old
    if (!payload.days_old || typeof payload.days_old !== 'number' || payload.days_old < 1) {
      return new Response(
        JSON.stringify({
          error: 'Invalid or missing days_old',
          required: {
            days_old: 'number (greater than 0) - Delete entries older than this many days'
          },
          optional: {
            platform: 'reddit | linkedin | X - Delete only from specific platform'
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - payload.days_old);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    console.log(`Deleting entries older than ${cutoffDateStr}`);

    // Build query
    let query = supabase
      .from('outreach_entries')
      .delete()
      .lt('date', cutoffDateStr);

    // Add platform filter if specified
    if (payload.platform) {
      if (!['reddit', 'linkedin', 'X'].includes(payload.platform)) {
        return new Response(
          JSON.stringify({ error: 'Invalid platform. Must be: reddit, linkedin, or X' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      query = query.eq('platform', payload.platform);
    }

    // Execute delete with returning count
    const { data, error } = await query.select();

    if (error) {
      console.error('Error deleting entries:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const deletedCount = data?.length || 0;
    console.log(`Deleted ${deletedCount} entries`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Deleted entries older than ${payload.days_old} days`,
        deleted_count: deletedCount,
        cutoff_date: cutoffDateStr,
        platform: payload.platform || 'all'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

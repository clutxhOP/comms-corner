import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface AddEntryPayload {
  source: 'reddit' | 'linkedin' | 'X';
  date: string;
  link: string;
  comment: string;
  notes?: string;
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

    const payload: AddEntryPayload = await req.json();

    console.log('Received payload:', JSON.stringify(payload));

    // Validate required fields
    if (!payload.source || !payload.date || !payload.link || !payload.comment) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          required: {
            source: 'reddit | linkedin | X',
            date: 'ISO date string (YYYY-MM-DD)',
            link: 'string (URL)',
            comment: 'string'
          },
          optional: {
            notes: 'string'
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate source
    if (!['reddit', 'linkedin', 'X'].includes(payload.source)) {
      return new Response(
        JSON.stringify({ error: 'Invalid source. Must be: reddit, linkedin, or X' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(payload.date)) {
      return new Response(
        JSON.stringify({ error: 'Invalid date format. Must be YYYY-MM-DD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert the entry using service role (bypasses RLS)
    const { data, error } = await supabase
      .from('outreach_entries')
      .insert({
        platform: payload.source,
        date: payload.date,
        link: payload.link,
        comment: payload.comment,
        notes: payload.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting entry:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Entry created successfully:', data.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Entry added successfully',
        data: {
          id: data.id,
          platform: data.platform,
          date: data.date,
          link: data.link
        }
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

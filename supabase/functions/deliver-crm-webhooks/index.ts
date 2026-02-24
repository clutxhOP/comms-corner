import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

async function hmacSign(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const hashArray = Array.from(new Uint8Array(sig))
  return 'sha256=' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Fetch pending events (max 50 per run)
    const { data: events, error: fetchError } = await supabase
      .from('crm_webhook_events')
      .select('*')
      .eq('status', 'pending')
      .lt('retry_count', 3)
      .order('executed_at', { ascending: true })
      .limit(50)

    if (fetchError) throw fetchError
    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending events' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const results: { id: string; status: string; response_status?: number }[] = []

    for (const event of events) {
      const { id, event_type, payload, webhook_id, request_url, retry_count } = event

      // Get webhook secret
      let secret = ''
      if (webhook_id) {
        const { data: wh } = await supabase
          .from('crm_webhooks')
          .select('secret')
          .eq('id', webhook_id)
          .maybeSingle()
        secret = wh?.secret || ''
      }

      const body = JSON.stringify({
        event: event_type,
        timestamp: new Date().toISOString(),
        data: payload,
      })

      const signature = secret ? await hmacSign(secret, body) : ''

      try {
        const response = await fetch(request_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(signature ? { 'X-Webhook-Signature': signature } : {}),
          },
          body,
          signal: AbortSignal.timeout(10000),
        })

        const responseBody = await response.text().catch(() => '')

        await supabase
          .from('crm_webhook_events')
          .update({
            status: response.ok ? 'sent' : 'failed',
            success: response.ok,
            response_status: response.status,
            response_body: responseBody.slice(0, 2000),
            retry_count: retry_count + 1,
            executed_at: new Date().toISOString(),
          })
          .eq('id', id)

        results.push({ id, status: response.ok ? 'sent' : 'failed', response_status: response.status })
      } catch (err) {
        await supabase
          .from('crm_webhook_events')
          .update({
            status: retry_count + 1 >= 3 ? 'failed' : 'pending',
            error_message: err.message?.slice(0, 500) || 'Unknown error',
            retry_count: retry_count + 1,
            executed_at: new Date().toISOString(),
          })
          .eq('id', id)

        results.push({ id, status: 'error' })
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

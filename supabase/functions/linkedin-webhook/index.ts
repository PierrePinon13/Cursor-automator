
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const webhookData = await req.json()
    console.log('LinkedIn webhook received:', webhookData)

    // Handle different webhook events from Unipile
    if (webhookData.type === 'account.created' && webhookData.provider === 'linkedin') {
      const { account_id, metadata } = webhookData
      const user_id = metadata?.user_id

      if (!user_id || !account_id) {
        console.error('Missing user_id or account_id in webhook')
        return new Response('Missing required data', { status: 400 })
      }

      // Store the LinkedIn connection in our database
      const { data, error } = await supabaseClient
        .from('linkedin_connections')
        .upsert({
          user_id: user_id,
          unipile_account_id: account_id,
          connection_status: 'connected',
          linkedin_profile_url: webhookData.account?.profile_url || null,
        })

      if (error) {
        console.error('Error storing LinkedIn connection:', error)
        return new Response('Database error', { status: 500 })
      }

      console.log('LinkedIn connection stored successfully:', data)
    }

    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('Error in linkedin-webhook function:', error)
    return new Response('Internal server error', { status: 500 })
  }
})

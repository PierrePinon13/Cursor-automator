
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
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { user_id } = await req.json()

    if (!user_id || user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Invalid user ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const unipileApiKey = Deno.env.get('UNIPILE_API_KEY')
    if (!unipileApiKey) {
      return new Response(
        JSON.stringify({ error: 'Unipile API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Initiating LinkedIn connection for user:', user_id, 'with email:', user.email)

    // Clean up existing pending connections
    await supabaseClient
      .from('linkedin_connections')
      .delete()
      .eq('user_id', user_id)
      .eq('status', 'pending')

    // Construct webhook URL
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/linkedin-webhook`

    // Call Unipile API using the hosted accounts link endpoint
    const unipileResponse = await fetch('https://api9.unipile.com:13946/api/v1/hosted/accounts/link', {
      method: 'POST',
      headers: {
        'X-API-KEY': unipileApiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'create',
        providers: 'LINKEDIN',
        notify_url: webhookUrl,
        metadata: {
          user_id: user_id,
          email: user.email
        }
      }),
    })

    if (!unipileResponse.ok) {
      const errorText = await unipileResponse.text()
      console.error('Unipile API error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to create LinkedIn connection link' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const unipileData = await unipileResponse.json()
    console.log('Unipile response:', unipileData)

    // Store the pending connection
    const { error: insertError } = await supabaseClient
      .from('linkedin_connections')
      .insert({
        user_id: user_id,
        unipile_account_id: unipileData.account_id,
        account_id: unipileData.account_id,
        status: 'pending',
        account_type: 'LINKEDIN'
      })

    if (insertError) {
      console.error('Error storing pending connection:', insertError)
    }

    return new Response(
      JSON.stringify({ 
        link: unipileData.hosted_link,
        account_id: unipileData.account_id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in linkedin-connect function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

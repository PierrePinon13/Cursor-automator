
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

    // Construct webhook URL
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/linkedin-webhook`
    
    // Set expiration to 1 hour from now
    const expiresOn = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    // Call Unipile API using the hosted accounts link endpoint with all required parameters
    const unipileResponse = await fetch('https://api9.unipile.com:13946/api/v1/hosted/accounts/link', {
      method: 'POST',
      headers: {
        'X-API-KEY': unipileApiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'create',
        providers: ['LINKEDIN'], // Use array instead of string
        expiresOn: expiresOn,
        api_url: 'https://api9.unipile.com:13946',
        notify_url: webhookUrl,
        name: user.email || user_id, // Required field - use email which will help with fallback lookup
        metadata: {
          user_id: user_id,
          email: user.email,
          // Add additional metadata for better tracking
          created_at: new Date().toISOString()
        }
      }),
    })

    if (!unipileResponse.ok) {
      const errorText = await unipileResponse.text()
      console.error('Unipile API error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to create LinkedIn connection link', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const unipileData = await unipileResponse.json()
    console.log('Unipile response:', unipileData)

    // Extract the correct URL from the response
    const hostedLink = unipileData.url || unipileData.hosted_link

    if (!hostedLink) {
      console.error('No hosted link found in Unipile response:', unipileData)
      return new Response(
        JSON.stringify({ error: 'No hosted link received from Unipile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        link: hostedLink
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

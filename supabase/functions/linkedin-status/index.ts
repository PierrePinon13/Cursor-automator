
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

    const { account_id } = await req.json()

    if (!account_id) {
      return new Response(
        JSON.stringify({ error: 'Missing account_id' }),
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

    console.log('Checking LinkedIn account status for account_id:', account_id)

    // Call Unipile API to get account status
    const unipileResponse = await fetch(`https://api9.unipile.com:13946/api/v1/accounts/${account_id}`, {
      method: 'GET',
      headers: {
        'X-API-KEY': unipileApiKey,
        'Accept': 'application/json',
      },
    })

    if (!unipileResponse.ok) {
      const errorText = await unipileResponse.text()
      console.error('Unipile API error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to check account status', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const accountData = await unipileResponse.json()
    console.log('Unipile account data:', accountData)

    const { status, provider, username, display_name } = accountData

    // Map Unipile status to our database status
    let mappedStatus = status
    let connectionStatus = status
    let errorMessage = null

    switch (status) {
      case 'OK':
        mappedStatus = 'connected'
        connectionStatus = 'connected'
        break
      case 'CREDENTIALS':
        mappedStatus = 'credentials_required'
        connectionStatus = 'credentials_required'
        errorMessage = 'Identifiants LinkedIn invalides ou expirés'
        break
      case 'IN_APP_VALIDATION':
        mappedStatus = 'validation_required'
        connectionStatus = 'validation_required'
        errorMessage = 'Validation dans l\'application LinkedIn requise'
        break
      case 'CHECKPOINT':
        mappedStatus = 'checkpoint_required'
        connectionStatus = 'checkpoint_required'
        errorMessage = 'Action utilisateur requise (code 2FA, vérification)'
        break
      case 'CAPTCHA':
        mappedStatus = 'captcha_required'
        connectionStatus = 'captcha_required'
        errorMessage = 'Résolution de captcha nécessaire'
        break
      case 'DISCONNECTED':
        mappedStatus = 'disconnected'
        connectionStatus = 'disconnected'
        errorMessage = 'Compte déconnecté'
        break
      default:
        mappedStatus = 'unknown'
        connectionStatus = 'unknown'
        errorMessage = `Statut inconnu: ${status}`
    }

    // Update the connection in our database
    const { data, error } = await supabaseClient
      .from('linkedin_connections')
      .update({
        status: mappedStatus,
        connection_status: connectionStatus,
        error_message: errorMessage,
        linkedin_profile_url: username ? `https://linkedin.com/in/${username}` : null,
        last_update: new Date().toISOString(),
        connected_at: status === 'OK' ? new Date().toISOString() : null,
      })
      .eq('account_id', account_id)
      .eq('user_id', user.id)
      .select()

    if (error) {
      console.error('Error updating LinkedIn connection:', error)
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!data || data.length === 0) {
      console.log('No matching connection found for account_id:', account_id)
      return new Response(
        JSON.stringify({ error: 'Connection not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('LinkedIn connection status updated successfully:', data[0])

    return new Response(
      JSON.stringify({ 
        success: true, 
        status: mappedStatus,
        connection_status: connectionStatus,
        error_message: errorMessage,
        account_data: {
          provider,
          username,
          display_name,
          original_status: status
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in linkedin-status function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

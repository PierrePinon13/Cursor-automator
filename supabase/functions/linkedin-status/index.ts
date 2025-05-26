
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('=== LinkedIn Status Check Function Called ===')
  console.log('Request method:', req.method)
  console.log('Request headers:', Object.fromEntries(req.headers.entries()))

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Starting LinkedIn Status Check ===')
    
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
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated:', user.id)

    const { account_id } = await req.json()
    console.log('Account ID to check:', account_id)

    if (!account_id) {
      console.error('Missing account_id parameter')
      return new Response(
        JSON.stringify({ error: 'Missing account_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if account_id is still pending
    if (account_id === 'pending') {
      console.log('Account is still pending, cannot check status with Unipile')
      
      // Update the connection status to reflect that it's still pending
      const { data, error } = await supabaseClient
        .from('linkedin_connections')
        .update({
          status: 'pending',
          connection_status: 'pending',
          error_message: 'Connexion en cours, veuillez patienter...',
          last_update: new Date().toISOString(),
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

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: 'pending',
          connection_status: 'pending',
          error_message: 'Connexion en cours, veuillez patienter...',
          account_data: {
            original_status: 'pending'
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const unipileApiKey = Deno.env.get('UNIPILE_API_KEY')
    if (!unipileApiKey) {
      console.error('Unipile API key not configured')
      return new Response(
        JSON.stringify({ error: 'Unipile API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Checking LinkedIn account status for account_id:', account_id)

    // Call Unipile API to get account status
    const unipileUrl = `https://api9.unipile.com:13946/api/v1/accounts/${account_id}`
    console.log('Calling Unipile API:', unipileUrl)
    
    const unipileResponse = await fetch(unipileUrl, {
      method: 'GET',
      headers: {
        'X-API-KEY': unipileApiKey,
        'Accept': 'application/json',
      },
    })

    console.log('Unipile API response status:', unipileResponse.status)

    if (!unipileResponse.ok) {
      const errorText = await unipileResponse.text()
      console.error('Unipile API error response:', errorText)
      
      // Handle specific error cases
      if (unipileResponse.status === 404) {
        console.log('Account not found (404), marking as disconnected')
        // Account not found, mark as disconnected
        const { data, error } = await supabaseClient
          .from('linkedin_connections')
          .update({
            status: 'disconnected',
            connection_status: 'disconnected',
            error_message: 'Compte LinkedIn introuvable ou supprimé',
            last_update: new Date().toISOString(),
          })
          .eq('account_id', account_id)
          .eq('user_id', user.id)
          .select()

        if (error) {
          console.error('Error updating LinkedIn connection for 404:', error)
          return new Response(
            JSON.stringify({ error: 'Database error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            status: 'disconnected',
            connection_status: 'disconnected',
            error_message: 'Compte LinkedIn introuvable ou supprimé',
            account_data: {
              original_status: 'not_found'
            }
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      console.error('Unipile API failed with status:', unipileResponse.status)
      return new Response(
        JSON.stringify({ error: 'Failed to check account status', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const accountData = await unipileResponse.json()
    console.log('Unipile account data received:', JSON.stringify(accountData, null, 2))

    const { status, provider, username, display_name } = accountData

    console.log('Extracted data from Unipile:', { status, provider, username, display_name })

    // Map Unipile status to our database status with better handling
    let mappedStatus = 'unknown'
    let connectionStatus = 'unknown'
    let errorMessage = null

    // Handle the case where status might be undefined or null
    const unipileStatus = status || 'UNKNOWN'
    console.log('Processing Unipile status:', unipileStatus)

    switch (unipileStatus.toUpperCase()) {
      case 'OK':
      case 'CONNECTED':
        mappedStatus = 'connected'
        connectionStatus = 'connected'
        errorMessage = null
        console.log('Status mapped to: connected')
        break
      case 'CREDENTIALS':
        mappedStatus = 'credentials_required'
        connectionStatus = 'credentials_required'
        errorMessage = 'Identifiants LinkedIn invalides ou expirés'
        console.log('Status mapped to: credentials_required')
        break
      case 'IN_APP_VALIDATION':
        mappedStatus = 'validation_required'
        connectionStatus = 'validation_required'
        errorMessage = 'Validation dans l\'application LinkedIn requise'
        console.log('Status mapped to: validation_required')
        break
      case 'CHECKPOINT':
        mappedStatus = 'checkpoint_required'
        connectionStatus = 'checkpoint_required'
        errorMessage = 'Action utilisateur requise (code 2FA, vérification)'
        console.log('Status mapped to: checkpoint_required')
        break
      case 'CAPTCHA':
        mappedStatus = 'captcha_required'
        connectionStatus = 'captcha_required'
        errorMessage = 'Résolution de captcha nécessaire'
        console.log('Status mapped to: captcha_required')
        break
      case 'DISCONNECTED':
        mappedStatus = 'disconnected'
        connectionStatus = 'disconnected'
        errorMessage = 'Compte déconnecté'
        console.log('Status mapped to: disconnected')
        break
      case 'UNKNOWN':
      case 'UNDEFINED':
      case '':
      case null:
      case undefined:
        mappedStatus = 'connected' // Par défaut, si on arrive ici c'est que le compte existe
        connectionStatus = 'connected'
        errorMessage = null
        console.log('Status was undefined/unknown, defaulting to: connected')
        break
      default:
        mappedStatus = 'unknown'
        connectionStatus = 'unknown'
        errorMessage = `Statut Unipile non reconnu: ${unipileStatus}`
        console.log('Status mapped to: unknown, with error:', errorMessage)
    }

    console.log('Final mapped status:', { mappedStatus, connectionStatus, errorMessage })

    // Update the connection in our database
    const updateData = {
      status: mappedStatus,
      connection_status: connectionStatus,
      error_message: errorMessage,
      linkedin_profile_url: username ? `https://linkedin.com/in/${username}` : null,
      last_update: new Date().toISOString(),
      connected_at: mappedStatus === 'connected' ? new Date().toISOString() : null,
    }

    console.log('Updating database with:', updateData)

    const { data, error } = await supabaseClient
      .from('linkedin_connections')
      .update(updateData)
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
          original_status: unipileStatus,
          raw_response: accountData
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in linkedin-status function:', error)
    console.error('Error stack:', error.stack)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

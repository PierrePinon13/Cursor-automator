
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('=== LinkedIn Sync Accounts Function Called ===')
  console.log('Request method:', req.method)
  console.log('Request headers:', Object.fromEntries(req.headers.entries()))

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Starting LinkedIn Accounts Sync ===')
    
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

    const unipileApiKey = Deno.env.get('UNIPILE_API_KEY')
    if (!unipileApiKey) {
      console.error('Unipile API key not configured')
      return new Response(
        JSON.stringify({ error: 'Unipile API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Fetching all LinkedIn accounts from Unipile...')

    // Call Unipile API to get all accounts
    const unipileUrl = 'https://api9.unipile.com:13946/api/v1/accounts'
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
      return new Response(
        JSON.stringify({ error: 'Failed to fetch accounts from Unipile', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const accountsData = await unipileResponse.json()
    console.log('Unipile accounts data received:', JSON.stringify(accountsData, null, 2))

    // Filter LinkedIn accounts only
    const linkedinAccounts = accountsData.filter((account: any) => 
      account.provider === 'LINKEDIN' || account.account_type === 'LINKEDIN'
    )

    console.log('Found LinkedIn accounts:', linkedinAccounts.length)

    const syncResults = []

    // Get existing connections for this user
    const { data: existingConnections, error: fetchError } = await supabaseClient
      .from('linkedin_connections')
      .select('*')
      .eq('user_id', user.id)

    if (fetchError) {
      console.error('Error fetching existing connections:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Existing connections found:', existingConnections?.length || 0)

    // Process each LinkedIn account
    for (const account of linkedinAccounts) {
      console.log('Processing account:', account.id, 'status:', account.status)

      // Map Unipile status to our database status
      let mappedStatus = 'unknown'
      let connectionStatus = 'unknown'
      let errorMessage = null

      const unipileStatus = account.status || 'UNKNOWN'
      console.log('Processing Unipile status:', unipileStatus)

      switch (unipileStatus.toUpperCase()) {
        case 'OK':
        case 'CONNECTED':
          mappedStatus = 'connected'
          connectionStatus = 'connected'
          errorMessage = null
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
        case 'UNKNOWN':
        case 'UNDEFINED':
        case '':
        case null:
        case undefined:
          // Si on a les infos du compte, il est probablement connecté
          mappedStatus = 'connected'
          connectionStatus = 'connected'
          errorMessage = null
          console.log('Status was undefined/unknown, defaulting to: connected')
          break
        default:
          mappedStatus = 'unknown'
          connectionStatus = 'unknown'
          errorMessage = `Statut Unipile non reconnu: ${unipileStatus}`
      }

      // Check if we already have this account in our database
      const existingConnection = existingConnections?.find(conn => 
        conn.account_id === account.id || conn.unipile_account_id === account.id
      )

      const updateData = {
        user_id: user.id,
        account_id: account.id,
        unipile_account_id: account.id,
        status: mappedStatus,
        connection_status: connectionStatus,
        error_message: errorMessage,
        account_type: 'LINKEDIN',
        linkedin_profile_url: account.username ? `https://linkedin.com/in/${account.username}` : null,
        last_update: new Date().toISOString(),
        connected_at: mappedStatus === 'connected' ? (existingConnection?.connected_at || new Date().toISOString()) : null,
      }

      if (existingConnection) {
        // Update existing connection
        console.log('Updating existing connection:', existingConnection.id)
        
        const { data, error } = await supabaseClient
          .from('linkedin_connections')
          .update(updateData)
          .eq('id', existingConnection.id)
          .select()

        if (error) {
          console.error('Error updating connection:', error)
          syncResults.push({ account_id: account.id, status: 'error', error: error.message })
        } else {
          console.log('Connection updated successfully:', data[0])
          syncResults.push({ account_id: account.id, status: 'updated', data: data[0] })
        }
      } else {
        // Create new connection
        console.log('Creating new connection for account:', account.id)
        
        const { data, error } = await supabaseClient
          .from('linkedin_connections')
          .insert(updateData)
          .select()

        if (error) {
          console.error('Error creating connection:', error)
          syncResults.push({ account_id: account.id, status: 'error', error: error.message })
        } else {
          console.log('Connection created successfully:', data[0])
          syncResults.push({ account_id: account.id, status: 'created', data: data[0] })
        }
      }
    }

    console.log('=== Sync completed ===')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Comptes LinkedIn synchronisés avec succès',
        accounts_processed: linkedinAccounts.length,
        results: syncResults
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in linkedin-sync-accounts function:', error)
    console.error('Error stack:', error.stack)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

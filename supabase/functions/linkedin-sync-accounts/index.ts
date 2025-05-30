
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('=== LinkedIn Sync Accounts Function Called ===')
  console.log('Request method:', req.method)

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

    const unipileData = await unipileResponse.json()
    console.log('Unipile response structure:', {
      hasItems: 'items' in unipileData,
      isArray: Array.isArray(unipileData),
      keys: Object.keys(unipileData || {}),
      totalLength: unipileData?.items?.length || unipileData?.length || 0
    })

    // Handle both array and object responses from Unipile API
    let accountsArray = []
    if (Array.isArray(unipileData)) {
      accountsArray = unipileData
    } else if (unipileData && unipileData.items && Array.isArray(unipileData.items)) {
      accountsArray = unipileData.items
    } else {
      console.error('Unexpected Unipile response format:', unipileData)
      return new Response(
        JSON.stringify({ 
          error: 'Unexpected response format from Unipile API',
          received: typeof unipileData,
          structure: Object.keys(unipileData || {})
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Accounts array extracted, length:', accountsArray.length)

    // Filter LinkedIn accounts only
    const linkedinAccounts = accountsArray.filter((account: any) => 
      account.provider === 'LINKEDIN' || account.account_type === 'LINKEDIN'
    )

    console.log('Found LinkedIn accounts:', linkedinAccounts.length)

    // Get the user's current profile
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('unipile_account_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find the most recent connected LinkedIn account for this user
    // This could be improved by checking metadata if Unipile provides user association
    let latestAccount = null
    if (linkedinAccounts.length > 0) {
      // For now, take the most recent account or the currently stored one
      latestAccount = linkedinAccounts.find(acc => acc.id === userProfile?.unipile_account_id) || linkedinAccounts[0]
    }

    let updateResult = null
    if (latestAccount && latestAccount.status === 'OK') {
      // Update the user's profile with the latest account ID
      const { data, error } = await supabaseClient
        .from('profiles')
        .update({ 
          unipile_account_id: latestAccount.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()

      if (error) {
        console.error('Error updating profile:', error)
      } else {
        console.log('Profile updated with account ID:', latestAccount.id)
        updateResult = data[0]
      }
    }

    console.log('=== Sync completed ===')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Compte LinkedIn synchronisé avec succès',
        accounts_found: linkedinAccounts.length,
        current_account: latestAccount?.id || null,
        updated_profile: updateResult
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

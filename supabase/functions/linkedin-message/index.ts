
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Add random delay between 2-8 seconds like in the profile scraper
function getRandomDelay(): number {
  return Math.floor(Math.random() * (8000 - 2000 + 1)) + 2000; // Random between 2000-8000ms
}

// Sleep function for delay
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { lead_profile_id, message } = await req.json()

    if (!lead_profile_id || !message) {
      console.error('Missing parameters:', { lead_profile_id, message })
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    console.log('Processing LinkedIn message for lead profile:', lead_profile_id)

    // Get user's LinkedIn connection
    const { data: connections, error: connectionError } = await supabaseClient
      .from('linkedin_connections')
      .select('account_id, unipile_account_id')
      .eq('user_id', user.id)
      .eq('status', 'connected')
      .limit(1)

    if (connectionError) {
      console.error('Connection query error:', connectionError)
      return new Response(
        JSON.stringify({ error: 'Database error checking connections' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!connections || connections.length === 0) {
      console.error('No active LinkedIn connection found')
      return new Response(
        JSON.stringify({ error: 'No active LinkedIn connection found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userAccountId = connections[0].account_id || connections[0].unipile_account_id

    if (!userAccountId) {
      console.error('No account ID found in connection')
      return new Response(
        JSON.stringify({ error: 'Invalid LinkedIn connection configuration' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Add random delay before making the API call to avoid rate limiting
    const delayMs = getRandomDelay();
    console.log(`Adding random delay of ${delayMs}ms before Unipile API call`);
    await sleep(delayMs);

    // Extract clean profile ID from the lead_profile_id
    let cleanProfileId = lead_profile_id;
    if (lead_profile_id.includes('?')) {
      cleanProfileId = lead_profile_id.split('?')[0];
    }
    
    console.log('Clean profile ID:', cleanProfileId);

    // Step 1: Get profile information to check connection degree
    console.log('Fetching profile information for:', cleanProfileId)
    
    const profileParams = new URLSearchParams({
      account_id: userAccountId,
      linkedin_sections: 'experience'
    });

    const profileResponse = await fetch(`https://api9.unipile.com:13946/api/v1/users/${cleanProfileId}?${profileParams}`, {
      method: 'GET',
      headers: {
        'X-API-KEY': unipileApiKey,
        'Accept': 'application/json',
      }
    })

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text()
      console.error('Profile fetch error:', profileResponse.status, errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profile information', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const profileData = await profileResponse.json()
    console.log('Profile data received:', JSON.stringify(profileData, null, 2))

    // Check connection degree - try multiple possible field names
    const connectionDegree = profileData.connection_degree || 
                           profileData.degree || 
                           profileData.connection || 
                           profileData.network_distance ||
                           'unknown'
    console.log('Connection degree determined:', connectionDegree)

    let actionTaken = ''
    let success = false

    // Try to determine if this is a 1st degree connection
    const isFirstDegree = connectionDegree === 'first' || 
                         connectionDegree === '1st' || 
                         connectionDegree === 1 ||
                         connectionDegree === '1' ||
                         (typeof connectionDegree === 'string' && connectionDegree.toLowerCase().includes('first'))

    if (isFirstDegree) {
      // Send direct message
      console.log('Sending direct message to 1st degree connection')
      
      const messageResponse = await fetch('https://api9.unipile.com:13946/api/v1/messages', {
        method: 'POST',
        headers: {
          'X-API-KEY': unipileApiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          account_id: userAccountId,
          provider_id: cleanProfileId,
          text: message,
          provider: 'LINKEDIN'
        }),
      })

      const messageData = await messageResponse.json()
      console.log('Message response:', messageResponse.status, JSON.stringify(messageData, null, 2))

      if (messageResponse.ok) {
        console.log('Message sent successfully')
        actionTaken = 'direct_message'
        success = true
      } else {
        console.error('Message send error:', messageData)
        throw new Error(`Failed to send message: ${JSON.stringify(messageData)}`)
      }

    } else {
      // Send connection request with message
      console.log('Sending connection request with message to non-1st degree connection')
      
      const connectionResponse = await fetch('https://api9.unipile.com:13946/api/v1/linkedin/connection_requests', {
        method: 'POST',
        headers: {
          'X-API-KEY': unipileApiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          account_id: userAccountId,
          provider_id: cleanProfileId,
          message: message
        }),
      })

      const connectionData = await connectionResponse.json()
      console.log('Connection response:', connectionResponse.status, JSON.stringify(connectionData, null, 2))

      if (connectionResponse.ok) {
        console.log('Connection request sent successfully')
        actionTaken = 'connection_request'
        success = true
      } else {
        console.error('Connection request error:', connectionData)
        throw new Error(`Failed to send connection request: ${JSON.stringify(connectionData)}`)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: success,
        action_taken: actionTaken,
        connection_degree: connectionDegree,
        message: success ? 'Message envoyé avec succès' : 'Échec de l\'envoi'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in linkedin-message function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

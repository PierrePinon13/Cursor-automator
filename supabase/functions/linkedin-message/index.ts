
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

    const { lead_profile_id, message } = await req.json()

    if (!lead_profile_id || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
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

    console.log('Processing LinkedIn message for lead profile:', lead_profile_id)

    // Get user's LinkedIn connection
    const { data: connections, error: connectionError } = await supabaseClient
      .from('linkedin_connections')
      .select('account_id')
      .eq('user_id', user.id)
      .eq('status', 'connected')
      .limit(1)

    if (connectionError || !connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No active LinkedIn connection found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userAccountId = connections[0].account_id

    // Step 1: Get profile information to check connection degree
    console.log('Fetching profile information for:', lead_profile_id)
    const profileResponse = await fetch(`https://api9.unipile.com:13946/api/v1/users/${lead_profile_id}`, {
      method: 'GET',
      headers: {
        'X-API-KEY': unipileApiKey,
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        account_id: userAccountId,
        linkedin_sections: 'experience'
      }),
    })

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text()
      console.error('Profile fetch error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profile information', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const profileData = await profileResponse.json()
    console.log('Profile data received:', profileData)

    // Check connection degree (assuming it's in the response, adjust based on actual API response)
    const connectionDegree = profileData.connection_degree || profileData.degree || 'unknown'
    console.log('Connection degree:', connectionDegree)

    let actionTaken = ''
    let success = false

    if (connectionDegree === 'first' || connectionDegree === '1st' || connectionDegree === 1) {
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
          provider_id: lead_profile_id,
          text: message,
          provider: 'LINKEDIN'
        }),
      })

      if (messageResponse.ok) {
        const messageData = await messageResponse.json()
        console.log('Message sent successfully:', messageData)
        actionTaken = 'direct_message'
        success = true
      } else {
        const errorText = await messageResponse.text()
        console.error('Message send error:', errorText)
        throw new Error(`Failed to send message: ${errorText}`)
      }

    } else {
      // Send connection request with message
      console.log('Sending connection request with message')
      
      const connectionResponse = await fetch('https://api9.unipile.com:13946/api/v1/linkedin/connection_requests', {
        method: 'POST',
        headers: {
          'X-API-KEY': unipileApiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          account_id: userAccountId,
          provider_id: lead_profile_id,
          message: message
        }),
      })

      if (connectionResponse.ok) {
        const connectionData = await connectionResponse.json()
        console.log('Connection request sent successfully:', connectionData)
        actionTaken = 'connection_request'
        success = true
      } else {
        const errorText = await connectionResponse.text()
        console.error('Connection request error:', errorText)
        throw new Error(`Failed to send connection request: ${errorText}`)
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

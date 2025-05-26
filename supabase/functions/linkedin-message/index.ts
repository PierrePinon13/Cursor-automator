
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Add random delay between 2-8 seconds like in n8n
function getRandomDelay(): number {
  return Math.floor(Math.random() * (8000 - 2000 + 1)) + 2000; // Random between 2000-8000ms
}

// Sleep function for delay
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

serve(async (req) => {
  console.log('=== LinkedIn Message Function Called ===')
  console.log('Request method:', req.method)
  console.log('Request URL:', req.url)
  console.log('Request headers:', Object.fromEntries(req.headers.entries()))

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request')
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Starting LinkedIn Message Function ===')
    
    // Initialize Supabase client
    console.log('Initializing Supabase client...')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )
    console.log('Supabase client initialized')

    // Get the current user
    console.log('Getting current user...')
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    console.log('User data:', user ? { id: user.id, email: user.email } : 'null')
    console.log('User error:', userError)

    if (userError || !user) {
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    console.log('Parsing request body...')
    let requestBody;
    try {
      requestBody = await req.json()
      console.log('Request body parsed:', requestBody)
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { lead_id, message } = requestBody

    console.log('Parameters received:', { lead_id, message })

    if (!lead_id || !message) {
      console.error('Missing parameters:', { lead_id, message })
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: lead_id and message' }),
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

    console.log('Processing LinkedIn message for lead ID:', lead_id)

    // Get the lead data from the database to extract author_profile_id
    console.log('Fetching lead data from database...')
    const { data: leadData, error: leadError } = await supabaseClient
      .from('linkedin_posts')
      .select('author_profile_id, author_profile_url, author_name')
      .eq('id', lead_id)
      .single()

    console.log('Lead data query result:', { leadData, leadError })

    if (leadError || !leadData) {
      console.error('Lead not found:', leadError)
      return new Response(
        JSON.stringify({ error: 'Lead not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const authorProfileId = leadData.author_profile_id
    if (!authorProfileId) {
      console.error('No author_profile_id found for lead:', lead_id)
      return new Response(
        JSON.stringify({ error: 'No LinkedIn profile ID found for this lead' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Using author_profile_id from database:', authorProfileId)

    // Get user's LinkedIn connection - chercher toute connexion active
    console.log('Fetching LinkedIn connections for user:', user.id)
    const { data: connections, error: connectionError } = await supabaseClient
      .from('linkedin_connections')
      .select('account_id, unipile_account_id')
      .eq('user_id', user.id)
      .in('status', ['connected', 'pending']) // Accepter aussi pending si nécessaire
      .limit(1)

    console.log('LinkedIn connections query result:', { connections, connectionError })

    if (connectionError) {
      console.error('Connection query error:', connectionError)
      return new Response(
        JSON.stringify({ error: 'Database error checking connections' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Si pas de connexion trouvée, utiliser un account_id par défaut (comme dans votre n8n)
    let userAccountId = null
    
    if (connections && connections.length > 0) {
      userAccountId = connections[0].account_id || connections[0].unipile_account_id
      console.log('Using account ID from database:', userAccountId)
    } else {
      // Utiliser l'account_id par défaut comme dans votre workflow n8n
      userAccountId = "V92UnMnXS9GRy_4xi-kG-g"
      console.log('No connection found in database, using default account_id:', userAccountId)
    }

    if (!userAccountId) {
      console.error('No account ID available')
      return new Response(
        JSON.stringify({ error: 'No LinkedIn account ID available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Add random delay before making the API call to avoid rate limiting
    const delayMs = getRandomDelay();
    console.log(`Adding random delay of ${delayMs}ms before Unipile API call`);
    await sleep(delayMs);

    // Step 1: Get profile information to check connection degree and get provider_id
    console.log('Fetching profile information for authorProfileId:', authorProfileId)
    
    const profileParams = new URLSearchParams({
      account_id: userAccountId,
      linkedin_sections: 'experience'
    });

    const profileUrl = `https://api9.unipile.com:13946/api/v1/users/${authorProfileId}?${profileParams}`;
    console.log('Profile API URL:', profileUrl);

    const profileResponse = await fetch(profileUrl, {
      method: 'GET',
      headers: {
        'X-API-KEY': unipileApiKey,
        'accept': 'application/json',
      }
    })

    console.log('Profile response status:', profileResponse.status)

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

    // Extract provider_id from the profile response
    const providerId = profileData.provider_id || profileData.id || authorProfileId
    console.log('Provider ID extracted:', providerId)

    // Check connection degree - look for network_distance like in n8n
    const networkDistance = profileData.network_distance || 
                           profileData.connection_degree || 
                           profileData.degree || 
                           profileData.connection || 
                           'unknown'
    console.log('Network distance determined:', networkDistance)

    let actionTaken = ''
    let success = false

    // Check if this is a first degree connection like in n8n workflow
    const isFirstDegree = networkDistance === 'FIRST_DEGREE'
    console.log('Is first degree connection (FIRST_DEGREE):', isFirstDegree)

    if (isFirstDegree) {
      // Send direct message using /api/v1/chats endpoint like in n8n
      console.log('Sending direct chat message to 1st degree connection with provider_id:', providerId)
      
      // Create FormData for multipart-form-data like in n8n
      const formData = new FormData();
      formData.append('account_id', userAccountId);
      formData.append('attendees_ids', providerId);
      formData.append('text', message);
      
      const chatResponse = await fetch('https://api9.unipile.com:13946/api/v1/chats', {
        method: 'POST',
        headers: {
          'X-API-KEY': unipileApiKey,
          'accept': 'application/json',
        },
        body: formData,
      })

      const chatData = await chatResponse.json()
      console.log('Chat response:', chatResponse.status, JSON.stringify(chatData, null, 2))

      if (chatResponse.ok) {
        console.log('Chat message sent successfully')
        actionTaken = 'direct_message'
        success = true
      } else {
        console.error('Chat message send error:', chatData)
        throw new Error(`Failed to send chat message: ${JSON.stringify(chatData)}`)
      }

    } else {
      // Send invitation using /api/v1/users/invite endpoint like in n8n
      console.log('Sending invitation to non-1st degree connection with provider_id:', providerId)
      
      const inviteResponse = await fetch('https://api9.unipile.com:13946/api/v1/users/invite', {
        method: 'POST',
        headers: {
          'X-API-KEY': unipileApiKey,
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: userAccountId,
          provider: 'LINKEDIN',
          provider_id: providerId,
          text: message
        }),
      })

      const inviteData = await inviteResponse.json()
      console.log('Invite response:', inviteResponse.status, JSON.stringify(inviteData, null, 2))

      if (inviteResponse.ok) {
        console.log('Invitation sent successfully')
        actionTaken = 'connection_request'
        success = true
      } else {
        console.error('Invitation send error:', inviteData)
        throw new Error(`Failed to send invitation: ${JSON.stringify(inviteData)}`)
      }
    }

    console.log('=== Function completed successfully ===')
    return new Response(
      JSON.stringify({ 
        success: success,
        action_taken: actionTaken,
        network_distance: networkDistance,
        provider_id: providerId,
        message: success ? 'Message envoyé avec succès' : 'Échec de l\'envoi',
        lead_name: leadData.author_name,
        account_id_used: userAccountId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('=== ERROR in linkedin-message function ===')
    console.error('Error details:', error)
    console.error('Error stack:', error.stack)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

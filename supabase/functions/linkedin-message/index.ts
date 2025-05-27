
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Random delay between 3-8 seconds (like in N8N flow)
function getRandomDelay(): number {
  return Math.floor(Math.random() * (8000 - 3000 + 1)) + 3000;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function validateAndGetActiveConnection(supabaseClient: any, userId: string) {
  console.log('Validating and getting active LinkedIn connection for user:', userId)
  
  // Get connections from database
  const { data: connections, error: connectionsError } = await supabaseClient
    .from('linkedin_connections')
    .select('*')
    .eq('user_id', userId)
    .order('connected_at', { ascending: false })

  if (connectionsError) {
    console.error('Database error fetching connections:', connectionsError)
    throw new Error('Erreur lors de la récupération des connexions LinkedIn.')
  }

  if (!connections || connections.length === 0) {
    console.error('No LinkedIn connections found for user:', userId)
    throw new Error('Aucune connexion LinkedIn trouvée. Veuillez connecter votre compte LinkedIn.')
  }

  // Find a connected account with valid account_id
  const validConnection = connections.find(conn => 
    conn.status === 'connected' && 
    conn.account_id && 
    conn.account_id.trim() !== ''
  )

  if (validConnection) {
    console.log('Found valid connected account:', validConnection.account_id)
    return validConnection
  }

  // If no valid connection, try to sync accounts automatically
  console.log('No valid connected account found, attempting auto-sync...')
  
  try {
    const syncResponse = await supabaseClient.functions.invoke('linkedin-sync-accounts')
    
    if (syncResponse.error) {
      console.error('Auto-sync failed:', syncResponse.error)
    } else if (syncResponse.data && syncResponse.data.success) {
      console.log('Auto-sync successful, re-checking for valid connections...')
      
      // Re-fetch connections after sync
      const { data: updatedConnections, error: refetchError } = await supabaseClient
        .from('linkedin_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'connected')
        .not('account_id', 'is', null)
        .order('connected_at', { ascending: false })
        .limit(1)

      if (!refetchError && updatedConnections && updatedConnections.length > 0) {
        console.log('Found valid connection after auto-sync:', updatedConnections[0].account_id)
        return updatedConnections[0]
      }
    }
  } catch (syncError) {
    console.error('Auto-sync attempt failed:', syncError)
  }

  // If still no valid connection, provide helpful error message
  const statusSummary = connections.map(conn => `${conn.account_id || 'no-id'}: ${conn.status}`).join(', ')
  console.error('No valid LinkedIn connection available. Status summary:', statusSummary)
  
  throw new Error('Aucune connexion LinkedIn active avec un identifiant valide. Veuillez reconnecter votre compte LinkedIn dans les paramètres.')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const requestBody = await req.json()
    const { lead_id, message } = requestBody
    
    console.log('Sending LinkedIn message for lead:', lead_id)
    console.log('Message length:', message?.length || 0)

    if (!lead_id || !message) {
      console.error('Missing required parameters:', { lead_id: !!lead_id, message: !!message })
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Lead ID and message are required',
          error_type: 'validation',
          user_message: 'Paramètres manquants pour l\'envoi du message.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

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

    // Get the current user from the request
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('User authentication error:', userError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authentication required',
          error_type: 'authentication',
          user_message: 'Vous devez être connecté pour envoyer un message.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    console.log('User authenticated:', user.id, user.email)

    // Get lead data with error handling
    const { data: lead, error: leadError } = await supabaseClient
      .from('linkedin_posts')
      .select('author_profile_url, author_name, author_profile_id')
      .eq('id', lead_id)
      .maybeSingle()

    if (leadError) {
      console.error('Database error fetching lead:', leadError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Database error',
          error_type: 'database_error',
          user_message: 'Erreur lors de la récupération des données du contact.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    if (!lead) {
      console.error('Lead not found for ID:', lead_id)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Lead not found',
          error_type: 'not_found',
          user_message: 'Contact non trouvé.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    // Get active LinkedIn connection with validation and auto-sync
    let connection
    try {
      connection = await validateAndGetActiveConnection(supabaseClient, user.id)
    } catch (error) {
      console.error('Connection validation failed:', error.message)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message,
          error_type: 'no_connection',
          user_message: error.message
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    const accountId = connection.account_id
    console.log('Using LinkedIn account for user', user.email, ':', accountId)

    if (!lead.author_profile_id) {
      console.error('No author_profile_id found for lead:', lead.author_name)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No author profile ID found',
          error_type: 'missing_profile_id',
          user_message: 'Identifiant de profil LinkedIn manquant pour ce contact.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // STEP 1: Scrape profile via unipile-queue
    console.log('Starting profile scraping for lead:', lead.author_name)
    
    const scrapeResponse = await supabaseClient.functions.invoke('unipile-queue', {
      body: {
        action: 'execute',
        account_id: accountId,
        priority: true,
        operation: 'scrape_profile',
        payload: {
          authorProfileId: lead.author_profile_id
        }
      }
    });

    if (scrapeResponse.error) {
      console.error('Profile scraping error:', scrapeResponse.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Profile scraping failed',
          error_type: 'scraping_failed',
          user_message: 'Impossible d\'analyser le profil LinkedIn de ce contact.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    if (!scrapeResponse.data || !scrapeResponse.data.success) {
      console.error('Profile scraping failed:', scrapeResponse.data);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Profile scraping failed',
          error_type: 'scraping_failed',
          user_message: 'Échec de l\'analyse du profil LinkedIn.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    const scrapedData = scrapeResponse.data.result;
    console.log('Profile scraped successfully:', { 
      provider_id: scrapedData.provider_id, 
      network_distance: scrapedData.network_distance 
    });

    // Update lead with scraped data (no await to avoid blocking)
    supabaseClient
      .from('linkedin_posts')
      .update({
        unipile_response: scrapedData,
        unipile_profile_scraped: true,
        unipile_profile_scraped_at: new Date().toISOString(),
        unipile_company: scrapedData.company?.name || null,
        unipile_position: scrapedData.headline || null
      })
      .eq('id', lead_id)
      .then(({ error }) => {
        if (error) console.error('Error updating lead with scraped data:', error)
      })

    const linkedinProviderId = scrapedData.provider_id;
    const networkDistance = scrapedData.network_distance;

    if (!linkedinProviderId) {
      console.error('No provider_id found in scraped data for lead:', lead.author_name)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No provider ID found after scraping',
          error_type: 'missing_provider_id',
          user_message: 'Impossible de récupérer l\'identifiant du profil LinkedIn après analyse.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // STEP 2: Wait random delay (3-8 seconds like in N8N)
    const waitTime = getRandomDelay();
    console.log(`Waiting ${waitTime}ms before LinkedIn action`);
    await sleep(waitTime);

    // STEP 3: Decide action based on network_distance
    let connectionStatus = 'not_connected'
    let connectionDegree = '3+'
    let actionTaken = ''
    let responseData = null

    console.log('Network distance detected:', networkDistance);

    if (networkDistance === 'FIRST_DEGREE') {
      // Send direct message to 1st degree connection
      console.log('Sending direct message to 1st degree connection');
      
      const messageResponse = await supabaseClient.functions.invoke('unipile-queue', {
        body: {
          action: 'execute',
          account_id: accountId,
          priority: true,
          operation: 'send_message',
          payload: {
            providerId: linkedinProviderId,
            message: message
          }
        }
      });

      if (messageResponse.error) {
        console.error('Direct message error:', messageResponse.error);
        throw new Error(`Direct message failed: ${messageResponse.error.message}`);
      }

      if (messageResponse.data && messageResponse.data.success) {
        responseData = messageResponse.data.result;
        connectionStatus = 'connected'
        connectionDegree = '1er'
        actionTaken = 'direct_message'
        console.log('Direct message sent successfully')
      } else {
        const errorData = messageResponse.data || {};
        const userMessage = errorData.user_message || 'Échec de l\'envoi du message LinkedIn direct.';
        throw new Error(userMessage);
      }
    } else {
      // Send connection invitation with message
      console.log('Sending connection invitation with message');
      
      const invitationResponse = await supabaseClient.functions.invoke('unipile-queue', {
        body: {
          action: 'execute',
          account_id: accountId,
          priority: true,
          operation: 'send_invitation',
          payload: {
            providerId: linkedinProviderId,
            message: message
          }
        }
      });

      if (invitationResponse.error) {
        console.error('Invitation error:', invitationResponse.error);
        throw new Error(`Invitation failed: ${invitationResponse.error.message}`);
      }

      if (invitationResponse.data && invitationResponse.data.success) {
        responseData = invitationResponse.data.result;
        actionTaken = 'connection_request'
        console.log('Connection invitation sent successfully')
      } else {
        const errorData = invitationResponse.data || {};
        const userMessage = errorData.user_message || 'Échec de l\'envoi de la demande de connexion LinkedIn.';
        throw new Error(userMessage);
      }
    }

    // Update the lead with LinkedIn message timestamp (no await to avoid blocking)
    const now = new Date().toISOString()
    
    supabaseClient
      .from('linkedin_posts')
      .update({
        linkedin_message_sent_at: now,
        last_contact_at: now
      })
      .eq('id', lead_id)
      .then(({ error }) => {
        if (error) console.error('Error updating lead timestamps:', error)
      })

    console.log(`LinkedIn ${actionTaken} completed for lead:`, lead_id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: actionTaken === 'direct_message' ? 'Message envoyé avec succès' : 'Demande de connexion envoyée avec succès',
        timestamp: now,
        action_taken: actionTaken,
        lead_name: lead.author_name || 'Contact',
        connection_degree: connectionDegree,
        provider_id_used: linkedinProviderId,
        network_distance: networkDistance,
        unipile_response: responseData,
        account_used: accountId,
        user_email: user.email
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in linkedin-message function:', error)
    
    // Extract user-friendly message if available
    let userMessage = error.message || 'Une erreur inattendue s\'est produite.';
    let errorType = 'unknown';
    
    // Check if error message contains our enhanced error info
    if (error.message.includes('LinkedIn est temporairement indisponible')) {
      errorType = 'provider_unavailable';
    } else if (error.message.includes('Erreur d\'authentification')) {
      errorType = 'authentication';
    } else if (error.message.includes('Trop de demandes')) {
      errorType = 'rate_limit';
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error',
        error_type: errorType,
        user_message: userMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})



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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { lead_id, message } = await req.json()
    
    console.log('Sending LinkedIn message for lead:', lead_id)
    console.log('Message:', message)

    if (!lead_id || !message) {
      console.error('Missing required parameters:', { lead_id, message })
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

    // Get lead data
    const { data: lead, error: leadError } = await supabaseClient
      .from('linkedin_posts')
      .select('author_profile_url, author_name, author_profile_id')
      .eq('id', lead_id)
      .single()

    if (leadError || !lead) {
      console.error('Error fetching lead:', leadError)
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

    // Get active LinkedIn connection for the authenticated user
    const { data: connections } = await supabaseClient
      .from('linkedin_connections')
      .select('account_id, unipile_account_id')
      .eq('user_id', user.id)
      .eq('status', 'connected')
      .limit(1)

    if (!connections || connections.length === 0) {
      console.error('No active LinkedIn connection found for user:', user.id)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No active LinkedIn connection. Please connect your LinkedIn account first.',
          error_type: 'no_connection',
          user_message: 'Aucune connexion LinkedIn active. Veuillez connecter votre compte LinkedIn.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    const connection = connections[0]
    const accountId = connection.account_id || connection.unipile_account_id

    console.log('Using LinkedIn account for user', user.email, ':', accountId)

    // Verify this is the expected account for Pierre Pinon
    if (user.email === 'ppinon@getpro.fr' && accountId !== 'DdxglDwFT-mMZgxHeCGMdA') {
      console.warn('WARNING: Expected account DdxglDwFT-mMZgxHeCGMdA for Pierre Pinon but found:', accountId)
    }

    // STEP 1: ALWAYS scrape the profile to get network_distance and provider_id
    console.log('Starting profile scraping for lead:', lead.author_name)
    
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

    // Scrape profile via unipile-queue
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

    // Update lead with scraped data
    const { error: updateError } = await supabaseClient
      .from('linkedin_posts')
      .update({
        unipile_response: scrapedData,
        unipile_profile_scraped: true,
        unipile_profile_scraped_at: new Date().toISOString(),
        unipile_company: scrapedData.company?.name || null,
        unipile_position: scrapedData.headline || null
      })
      .eq('id', lead_id)

    if (updateError) {
      console.error('Error updating lead with scraped data:', updateError)
    }

    // Extract provider_id and network_distance
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
    console.log(`Waiting ${waitTime}ms before LinkedIn action (simulating N8N random wait)`);
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

    // Update the lead with LinkedIn message timestamp
    const now = new Date().toISOString()
    
    const { error: timestampUpdateError } = await supabaseClient
      .from('linkedin_posts')
      .update({
        linkedin_message_sent_at: now,
        last_contact_at: now
      })
      .eq('id', lead_id)

    if (timestampUpdateError) {
      console.error('Error updating lead timestamps:', timestampUpdateError)
      // Don't throw here, the message was sent successfully
    }

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
    let userMessage = error.message;
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
        error: error.message,
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


import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get lead data including unipile_response for provider_id
    const { data: lead, error: leadError } = await supabaseClient
      .from('linkedin_posts')
      .select('author_profile_url, author_name, author_profile_id, unipile_response')
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
      .eq('user_id', user.id)  // Filter by current user
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

    // Get LinkedIn provider ID from unipile_response or fall back to profile ID extraction
    let linkedinProviderId = null
    
    if (lead.unipile_response?.provider_id) {
      linkedinProviderId = lead.unipile_response.provider_id
      console.log('Using provider_id from unipile_response:', linkedinProviderId)
    } else if (lead.unipile_response?.publicIdentifier) {
      linkedinProviderId = lead.unipile_response.publicIdentifier
      console.log('Using publicIdentifier from unipile_response:', linkedinProviderId)
    } else if (lead.author_profile_id) {
      linkedinProviderId = lead.author_profile_id
      console.log('Using author_profile_id as fallback:', linkedinProviderId)
    } else if (lead.author_profile_url) {
      // Extract LinkedIn profile ID from URL as last fallback
      const urlMatch = lead.author_profile_url.match(/linkedin\.com\/in\/([^\/\?]+)/)
      linkedinProviderId = urlMatch ? urlMatch[1] : null
      console.log('Extracted from URL as last fallback:', linkedinProviderId)
    }

    if (!linkedinProviderId) {
      console.error('Cannot determine LinkedIn provider ID for lead:', lead.author_name)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Cannot determine LinkedIn profile identifier',
          error_type: 'invalid_profile',
          user_message: 'Impossible de déterminer l\'identifiant LinkedIn du contact.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log('Checking connection status from profile data for provider ID:', linkedinProviderId)

    // Check network_distance from the unipile_response
    let connectionStatus = 'not_connected'
    let connectionDegree = '3+'
    let actionTaken = ''
    let responseData = null

    // Use the enhanced Unipile rate limiting with priority for LinkedIn messages
    const queueResponse = await supabaseClient.functions.invoke('unipile-queue', {
      body: {
        action: 'execute',
        account_id: accountId,
        priority: true, // LinkedIn messages have priority
        operation: lead.unipile_response?.network_distance === 'FIRST_DEGREE' ? 'send_message' : 'send_invitation',
        payload: {
          providerId: linkedinProviderId,
          message: message
        }
      }
    });

    if (queueResponse.error) {
      console.error('Queue error:', queueResponse.error);
      throw new Error(`Queue processing failed: ${queueResponse.error.message}`);
    }

    if (queueResponse.data && queueResponse.data.success) {
      responseData = queueResponse.data.result;
      
      if (lead.unipile_response?.network_distance === 'FIRST_DEGREE') {
        connectionStatus = 'connected'
        connectionDegree = '1er'
        actionTaken = 'direct_message'
        console.log('Direct message sent successfully')
      } else {
        actionTaken = 'connection_request'
        console.log('Connection invitation sent successfully')
      }
    } else {
      // Handle enhanced error responses from unipile-queue
      const errorData = queueResponse.data || {};
      const errorType = errorData.error_type || 'unknown';
      const userMessage = errorData.user_message || 'Échec de l\'envoi du message LinkedIn.';
      
      throw new Error(userMessage);
    }

    // Update the lead with LinkedIn message timestamp
    const now = new Date().toISOString()
    
    const { error: updateError } = await supabaseClient
      .from('linkedin_posts')
      .update({
        linkedin_message_sent_at: now,
        last_contact_at: now
      })
      .eq('id', lead_id)

    if (updateError) {
      console.error('Error updating lead timestamps:', updateError)
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

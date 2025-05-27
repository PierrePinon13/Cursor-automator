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
          error: 'Lead ID and message are required' 
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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
          error: 'Lead not found' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    // Get active LinkedIn connection
    const { data: connections } = await supabaseClient
      .from('linkedin_connections')
      .select('account_id, unipile_account_id')
      .eq('status', 'connected')
      .limit(1)

    if (!connections || connections.length === 0) {
      console.error('No active LinkedIn connection found')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No active LinkedIn connection. Please connect your LinkedIn account first.' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    const connection = connections[0]
    const accountId = connection.account_id || connection.unipile_account_id

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
          error: 'Cannot determine LinkedIn profile identifier' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log('Checking connection status from profile data for provider ID:', linkedinProviderId)

    // Check network_distance from the unipile_response (like in your n8n workflow)
    let connectionStatus = 'not_connected'
    let connectionDegree = '3+'
    let actionTaken = ''
    let responseData = null

    // Use the Unipile queue for rate limiting with high priority (1) for LinkedIn messages
    const queueResponse = await supabaseClient.functions.invoke('unipile-queue', {
      body: {
        action: 'execute_now', // High priority, execute immediately but with delay
        account_id: accountId,
        priority: 1, // Highest priority for LinkedIn messages
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
        console.log('Direct message sent successfully via queue')
      } else {
        actionTaken = 'connection_request'
        console.log('Connection invitation sent successfully via queue')
      }
    } else {
      throw new Error('Failed to process message through queue');
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
        message: actionTaken === 'direct_message' ? 'Message sent successfully' : 'Connection request sent successfully',
        timestamp: now,
        action_taken: actionTaken,
        lead_name: lead.author_name || 'Contact',
        connection_degree: connectionDegree,
        provider_id_used: linkedinProviderId,
        unipile_response: responseData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in linkedin-message function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

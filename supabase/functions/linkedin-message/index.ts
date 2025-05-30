
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { 
      leadId, 
      lead_id,  // Support both parameter names
      message, 
      userId,
      userFullName
    } = await req.json()

    // Use leadId if provided, otherwise use lead_id
    const finalLeadId = leadId || lead_id;

    console.log('🚀 Processing LinkedIn message workflow for lead:', finalLeadId)

    if (!finalLeadId) {
      throw new Error('Lead ID is required')
    }

    if (!userId) {
      throw new Error('User ID is required')
    }

    if (!message || !message.trim()) {
      throw new Error('Message content is required')
    }

    // Step 1: Get lead data - first try leads table, then linkedin_posts table
    console.log('📋 Step 1: Fetching lead data...')
    let lead = null;
    
    // Try leads table first
    const { data: leadFromLeads, error: leadError } = await supabaseClient
      .from('leads')
      .select('*')
      .eq('id', finalLeadId)
      .maybeSingle()

    if (leadFromLeads) {
      lead = leadFromLeads;
      console.log('✅ Lead found in leads table:', lead.author_name)
    } else {
      // If not found in leads, try linkedin_posts table
      console.log('🔍 Lead not found in leads table, checking linkedin_posts...')
      const { data: leadFromPosts, error: postError } = await supabaseClient
        .from('linkedin_posts')
        .select('*')
        .eq('id', finalLeadId)
        .maybeSingle()

      if (leadFromPosts) {
        lead = leadFromPosts;
        console.log('✅ Lead found in linkedin_posts table:', lead.author_name)
      } else {
        console.error('❌ Lead not found in either table:', { finalLeadId, leadError, postError })
        throw new Error(`Lead not found with ID: ${finalLeadId}`)
      }
    }

    // Step 2: Get user's Unipile account_id from linkedin_connections
    console.log('🔗 Step 2: Getting user LinkedIn connection...')
    const { data: userConnection, error: connectionError } = await supabaseClient
      .from('linkedin_connections')
      .select('unipile_account_id, account_id, status')
      .eq('user_id', userId)
      .eq('status', 'connected')
      .maybeSingle()

    if (!userConnection) {
      throw new Error('No active LinkedIn connection found for user. Please connect your LinkedIn account first.')
    }

    const accountId = userConnection.unipile_account_id || userConnection.account_id;
    if (!accountId) {
      throw new Error('No valid Unipile account ID found')
    }

    console.log('✅ Using Unipile account ID:', accountId)

    // Step 3: Extract LinkedIn profile ID from lead
    console.log('🔍 Step 3: Extracting LinkedIn profile ID...')
    let authorProfileId = lead.author_profile_id;
    if (!authorProfileId && lead.author_profile_url) {
      // Extract from URL if not already stored
      const match = lead.author_profile_url.match(/\/in\/([^\/\?]+)/);
      authorProfileId = match ? match[1] : null;
    }

    if (!authorProfileId) {
      throw new Error('No LinkedIn profile ID found for this lead')
    }

    console.log('✅ LinkedIn profile ID:', authorProfileId)

    // Step 4: Scrape the lead's profile to get provider_id and network_distance
    console.log('🔍 Step 4: Scraping lead profile via unipile-queue...')
    const { data: scrapeResult, error: scrapeError } = await supabaseClient.functions.invoke('unipile-queue', {
      body: {
        action: 'execute',
        account_id: accountId,
        operation: 'scrape_profile',
        payload: {
          authorProfileId: authorProfileId
        },
        priority: true
      }
    })

    if (scrapeError || !scrapeResult?.success) {
      console.error('❌ Profile scraping failed:', scrapeError || scrapeResult?.error)
      throw new Error(`Failed to scrape profile: ${scrapeError?.message || scrapeResult?.error || 'Unknown error'}`)
    }

    const profileData = scrapeResult.result;
    const providerId = profileData.provider_id;
    const networkDistance = profileData.network_distance;

    if (!providerId) {
      throw new Error('Could not retrieve provider_id from profile data')
    }

    console.log('✅ Profile scraped successfully:', { providerId, networkDistance })

    // Step 5: Determine action type based on network distance
    const isFirstDegree = networkDistance === '1st' || networkDistance === '1';
    const actionType = isFirstDegree ? 'send_message' : 'send_invitation';
    const messageType = isFirstDegree ? 'direct_message' : 'connection_request';

    console.log(`📤 Step 5: ${isFirstDegree ? 'Sending direct message' : 'Sending connection request'} (network distance: ${networkDistance})`)

    // Step 6: Send message or invitation via unipile-queue
    const { data: sendResult, error: sendError } = await supabaseClient.functions.invoke('unipile-queue', {
      body: {
        action: 'execute',
        account_id: accountId,
        operation: actionType,
        payload: {
          providerId: providerId,
          message: message.trim()
        },
        priority: true
      }
    })

    if (sendError || !sendResult?.success) {
      console.error(`❌ ${actionType} failed:`, sendError || sendResult?.error)
      throw new Error(`Failed to ${actionType}: ${sendError?.message || sendResult?.error || 'Unknown error'}`)
    }

    console.log(`✅ ${actionType} sent successfully`)

    // Step 7: Record activity in database ONLY after successful sending
    console.log('💾 Step 7: Recording activity in database...')
    const { data: activity, error: activityError } = await supabaseClient
      .from('activities')
      .insert({
        lead_id: finalLeadId,
        activity_type: 'linkedin_message',
        activity_data: {
          message_content: message.trim(),
          message_type: messageType,
          network_distance: networkDistance,
          recipient_profile_url: lead.author_profile_url,
          recipient_name: lead.author_name,
          unipile_response: sendResult.result
        },
        outcome: 'sent',
        performed_by_user_id: userId,
        performed_by_user_name: userFullName,
        performed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (activityError) {
      console.error('❌ Failed to create activity:', activityError)
      throw new Error(`Failed to create activity: ${activityError.message}`)
    }

    // Step 8: Update the appropriate table with the last contact info
    console.log('🔄 Step 8: Updating lead contact info...')
    
    // Update both tables if they exist
    if (leadFromLeads) {
      await supabaseClient
        .from('leads')
        .update({
          last_contact_at: new Date().toISOString(),
          linkedin_message_sent_at: new Date().toISOString(),
          last_updated_at: new Date().toISOString()
        })
        .eq('id', finalLeadId)
    }
    
    // Always try to update linkedin_posts as well since that's where the UI data comes from
    await supabaseClient
      .from('linkedin_posts')
      .update({
        last_contact_at: new Date().toISOString(),
        linkedin_message_sent_at: new Date().toISOString(),
        last_updated_at: new Date().toISOString()
      })
      .eq('id', finalLeadId)

    // Step 9: Increment user stats
    console.log('📊 Step 9: Updating user stats...')
    if (userId) {
      await supabaseClient.rpc('increment_linkedin_messages', {
        user_uuid: userId
      })
    }

    console.log('🎉 LinkedIn message workflow completed successfully:', activity.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        activityId: activity.id,
        messageType: messageType,
        networkDistance: networkDistance,
        message: `${messageType === 'direct_message' ? 'Message' : 'Connection request'} sent successfully`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: any) {
    console.error('💥 Error in linkedin-message function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

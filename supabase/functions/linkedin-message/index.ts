
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
      messageType = 'direct_message',
      userId,
      userFullName
    } = await req.json()

    // Use leadId if provided, otherwise use lead_id
    const finalLeadId = leadId || lead_id;

    console.log('Processing LinkedIn message for lead:', finalLeadId)

    if (!finalLeadId) {
      throw new Error('Lead ID is required')
    }

    // Check if this is a linkedin_posts ID or a leads ID by trying both tables
    let lead = null;
    let isLinkedInPost = false;

    // First try to get from leads table
    const { data: leadData, error: leadError } = await supabaseClient
      .from('leads')
      .select('*')
      .eq('id', finalLeadId)
      .maybeSingle()

    if (leadData) {
      lead = leadData;
    } else {
      // Try to get from linkedin_posts table if not found in leads
      const { data: postData, error: postError } = await supabaseClient
        .from('linkedin_posts')
        .select('*')
        .eq('id', finalLeadId)
        .maybeSingle()

      if (postData) {
        lead = postData;
        isLinkedInPost = true;
      }
    }

    if (!lead) {
      throw new Error(`Lead not found with ID: ${finalLeadId}`)
    }

    // Create the activity in the activities table
    const { data: activity, error: activityError } = await supabaseClient
      .from('activities')
      .insert({
        lead_id: isLinkedInPost ? lead.lead_id || finalLeadId : finalLeadId,
        activity_type: 'linkedin_message',
        activity_data: {
          message_content: message,
          message_type: messageType,
          recipient_profile_url: lead.author_profile_url,
          recipient_name: lead.author_name
        },
        outcome: 'sent',
        performed_by_user_id: userId,
        performed_by_user_name: userFullName,
        performed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (activityError) {
      throw new Error(`Failed to create activity: ${activityError.message}`)
    }

    // Update the appropriate table with the last contact info
    const updateData = {
      last_contact_at: new Date().toISOString(),
      linkedin_message_sent_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString()
    };

    if (isLinkedInPost) {
      // Update linkedin_posts table
      await supabaseClient
        .from('linkedin_posts')
        .update(updateData)
        .eq('id', finalLeadId)
    } else {
      // Update leads table
      await supabaseClient
        .from('leads')
        .update(updateData)
        .eq('id', finalLeadId)
    }

    // Increment user stats if we have a valid user
    if (userId) {
      await supabaseClient.rpc('increment_user_activity_stats', {
        user_uuid: userId,
        activity_type_param: 'linkedin_message'
      })
    }

    console.log('LinkedIn message activity created successfully:', activity.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        activityId: activity.id,
        message: 'Message recorded successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: any) {
    console.error('Error in linkedin-message function:', error)
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

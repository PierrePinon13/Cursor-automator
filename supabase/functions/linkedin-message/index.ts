
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
      message, 
      messageType = 'direct_message',
      userId,
      userFullName
    } = await req.json()

    console.log('Processing LinkedIn message for lead:', leadId)

    // Récupérer les informations du lead
    const { data: lead, error: leadError } = await supabaseClient
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      throw new Error(`Lead not found: ${leadError?.message}`)
    }

    // Créer l'activité dans la nouvelle table centralisée
    const { data: activity, error: activityError } = await supabaseClient
      .from('activities')
      .insert({
        lead_id: leadId,
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

    // Mettre à jour les stats utilisateur
    await supabaseClient.rpc('increment_user_activity_stats', {
      user_uuid: userId,
      activity_type_param: 'linkedin_message'
    })

    // Mettre à jour le lead avec la date du dernier contact
    await supabaseClient
      .from('leads')
      .update({
        last_contact_at: new Date().toISOString(),
        linkedin_message_sent_at: new Date().toISOString(),
        last_updated_at: new Date().toISOString()
      })
      .eq('id', leadId)

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

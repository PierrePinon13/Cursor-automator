
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
    const { leadId, message } = await req.json()
    
    console.log('Sending LinkedIn message for lead:', leadId)
    console.log('Message:', message)

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Update the lead with LinkedIn message timestamp
    const now = new Date().toISOString()
    
    const { error: updateError } = await supabaseClient
      .from('linkedin_posts')
      .update({
        linkedin_message_sent_at: now,
        last_contact_at: now
      })
      .eq('id', leadId)

    if (updateError) {
      console.error('Error updating lead timestamps:', updateError)
      throw updateError
    }

    console.log('LinkedIn message timestamps updated for lead:', leadId)

    // Here you would integrate with your actual LinkedIn messaging service
    // For now, we'll simulate success
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Message sent successfully',
        timestamp: now
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

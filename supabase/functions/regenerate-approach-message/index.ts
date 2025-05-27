
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { generateApproachMessageWithRetry } from '../process-linkedin-post/message-generation.ts'

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
    const { leadId } = await req.json();
    
    if (!leadId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'leadId is required' 
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Regenerating approach message for lead:', leadId);
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'OpenAI API key not configured' 
      }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch the lead data
    const { data: lead, error: fetchError } = await supabaseClient
      .from('linkedin_posts')
      .select('*')
      .eq('id', leadId)
      .single();

    if (fetchError || !lead) {
      console.error('Error fetching lead:', fetchError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Lead not found' 
      }), { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if we have the necessary data
    if (!lead.openai_step3_postes_selectionnes || !lead.author_name) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Lead does not have required OpenAI analysis data' 
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Regenerate the approach message
    const messageResult = await generateApproachMessageWithRetry(
      openAIApiKey,
      lead,
      lead.author_name,
      lead.openai_step3_postes_selectionnes
    );

    // Update the lead with the new message
    const updateData: any = {
      approach_message_generated: messageResult.success,
      approach_message_generated_at: new Date().toISOString()
    };

    if (messageResult.success && messageResult.message) {
      updateData.approach_message = messageResult.message;
    }

    if (messageResult.error) {
      let errorDetails = messageResult.error;
      if (messageResult.attempts) {
        errorDetails += ` (${messageResult.attempts} attempts)`;
      }
      if (messageResult.usedDefaultTemplate) {
        errorDetails += ' [Used default template]';
      }
      updateData.approach_message_error = errorDetails;
    }

    const { error: updateError } = await supabaseClient
      .from('linkedin_posts')
      .update(updateData)
      .eq('id', leadId);

    if (updateError) {
      console.error('Error updating lead:', updateError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to update lead' 
      }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Successfully regenerated approach message for lead:', leadId);

    return new Response(JSON.stringify({
      success: true,
      message: messageResult.message,
      usedDefaultTemplate: messageResult.usedDefaultTemplate,
      attempts: messageResult.attempts
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in regenerate-approach-message function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

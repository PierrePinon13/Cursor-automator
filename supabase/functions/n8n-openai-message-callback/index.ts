import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 N8N OpenAI Message Callback - Starting');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { message, personaId } = await req.json();
    
    if (!message || !personaId) {
      throw new Error('Missing required fields: message or personaId');
    }

    console.log(`📨 Processing message for persona: ${personaId}`);

    // Trouver le lead correspondant
    const { data: lead, error: leadError } = await supabaseClient
      .from('leads')
      .select('id')
      .eq('author_profile_id', personaId)
      .single();

    if (leadError || !lead) {
      throw new Error(`Could not find lead with persona_id: ${personaId}`);
    }

    // Mettre à jour le message d'approche du lead
    const { error: updateError } = await supabaseClient
      .from('leads')
      .update({
        approach_message: message,
        approach_message_generated: true,
        approach_message_generated_at: new Date().toISOString()
      })
      .eq('id', lead.id);

    if (updateError) {
      throw new Error(`Failed to update lead message: ${updateError.message}`);
    }

    console.log(`✅ Updated approach message for lead: ${lead.id}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Approach message updated successfully',
      leadId: lead.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in openai-message-callback:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}); 
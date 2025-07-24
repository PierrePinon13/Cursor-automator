
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BulkMessageResult {
  personaId: string;
  jobId: string;
  message: string;
  bulkRequestId: string;
  unipileAccountId: string;
  type: 'direct_message' | 'invitation';
  result: 'success' | 'error';
  errorMessage?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 N8N Bulk Messaging Callback - Starting');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const results: BulkMessageResult[] = await req.json();
    
    console.log(`🔄 Processing ${results.length} bulk messaging results`);

    const summary = {
      processed: 0,
      successful: 0,
      failed: 0,
      leads_updated: 0,
      activities_created: 0,
      errors: [] as string[]
    };

    // Process each messaging result
    for (const result of results) {
      try {
        console.log(`📨 Processing result for persona: ${result.personaId}`);
        
        // Find the lead by persona_id (LinkedIn profile ID)
        const { data: lead, error: leadError } = await supabaseClient
          .from('leads')
          .select('id, author_name, author_profile_url')
          .eq('author_profile_id', result.personaId)
          .single();

        if (leadError || !lead) {
          console.error(`❌ Lead not found for persona ${result.personaId}:`, leadError);
          summary.errors.push(`Lead not found for persona ${result.personaId}`);
          summary.failed++;
          continue;
        }

        // Update lead's last contact timestamp if message was successful
        if (result.result === 'success') {
          const { error: updateError } = await supabaseClient
            .from('leads')
            .update({
              last_contact_at: new Date().toISOString(),
              linkedin_message_sent_at: new Date().toISOString(),
              last_updated_at: new Date().toISOString()
            })
            .eq('id', lead.id);

          if (updateError) {
            console.error(`❌ Error updating lead ${lead.id}:`, updateError);
            summary.errors.push(`Failed to update lead ${lead.id}: ${updateError.message}`);
          } else {
            summary.leads_updated++;
            console.log(`✅ Updated last contact for lead: ${lead.id}`);
          }
        }

        if (result.result === 'success') {
          summary.successful++;
        } else {
          summary.failed++;
        }

        summary.processed++;

      } catch (error) {
        console.error(`❌ Error processing result for persona ${result.personaId}:`, error);
        summary.errors.push(`Error processing persona ${result.personaId}: ${error.message}`);
        summary.failed++;
      }
    }

    console.log('📊 Bulk messaging callback completed:', summary);

    return new Response(JSON.stringify({
      success: true,
      message: 'Bulk messaging results processed successfully',
      summary: summary
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in bulk messaging callback:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      message: 'Failed to process bulk messaging results'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

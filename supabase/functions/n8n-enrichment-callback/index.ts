
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
    console.log('📥 Received n8n enrichment callback');
    
    const requestBody = await req.json();
    console.log('📋 Callback payload:', JSON.stringify(requestBody, null, 2));

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle array of results or single result
    const results = Array.isArray(requestBody) ? requestBody : [requestBody];
    
    for (const enrichmentData of results) {
      if (!enrichmentData.linkedin_id) {
        console.error('❌ Missing linkedin_id in callback data:', enrichmentData);
        continue;
      }

      console.log('💾 Saving enrichment data for LinkedIn ID:', enrichmentData.linkedin_id);

      // Update companies table directly
      const updateData = {
        name: enrichmentData.name || null,
        description: enrichmentData.description || null,
        activities: enrichmentData.activities || null,
        employee_count: enrichmentData.employee_count || null,
        categorie: enrichmentData.categorie || null,
        industry: enrichmentData.industry || null,
        logo: enrichmentData.logo || null,
        last_enriched_at: new Date().toISOString(),
        enrichment_status: 'enriched',
        last_updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabaseClient
        .from('companies')
        .update(updateData)
        .eq('linkedin_id', enrichmentData.linkedin_id);

      if (updateError) {
        console.error('❌ Error updating company data:', updateError);
        
        // Mark as error in queue if exists
        await supabaseClient
          .from('company_enrichment_queue')
          .update({
            status: 'error',
            error_message: updateError.message,
            updated_at: new Date().toISOString()
          })
          .eq('linkedin_id', enrichmentData.linkedin_id);
          
        continue;
      }

      // Mark as completed in queue
      await supabaseClient
        .from('company_enrichment_queue')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('linkedin_id', enrichmentData.linkedin_id);

      console.log('✅ Enrichment data saved successfully for:', enrichmentData.linkedin_id);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Successfully processed ${results.length} enrichment result(s)`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('💥 Error in n8n-enrichment-callback function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

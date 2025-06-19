
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
    console.log('🤖 Starting automatic company enrichment process');

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find companies that need enrichment (never enriched or older than 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: companiesToEnrich, error: fetchError } = await supabaseClient
      .from('companies')
      .select('linkedin_id, enrichment_status, last_enriched_at')
      .or(`last_enriched_at.is.null,last_enriched_at.lt.${sixMonthsAgo.toISOString()}`)
      .neq('enrichment_status', 'processing')
      .limit(50); // Process in batches

    if (fetchError) {
      console.error('Error fetching companies to enrich:', fetchError);
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!companiesToEnrich || companiesToEnrich.length === 0) {
      console.log('No companies need enrichment');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No companies need enrichment',
        processed: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${companiesToEnrich.length} companies to enrich`);

    // Get available Unipile accounts
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('unipile_account_id')
      .not('unipile_account_id', 'is', null);

    if (profilesError || !profiles || profiles.length === 0) {
      console.error('No Unipile accounts available:', profilesError);
      return new Response(JSON.stringify({ 
        error: 'No Unipile accounts available for enrichment' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let processed = 0;
    let errors = 0;

    // Process each company
    for (const company of companiesToEnrich) {
      try {
        // Select random account for load balancing
        const randomAccount = profiles[Math.floor(Math.random() * profiles.length)];
        const accountId = randomAccount.unipile_account_id;

        console.log(`Processing company ${company.linkedin_id} with account ${accountId}`);

        // Add to enrichment queue
        await supabaseClient
          .from('company_enrichment_queue')
          .insert({
            linkedin_id: company.linkedin_id,
            status: 'processing',
            source: 'auto',
            account_id: accountId
          });

        // Add random delay between 2-8 seconds to respect rate limits
        const delay = Math.floor(Math.random() * 6000) + 2000;
        console.log(`⏱️ Adding ${delay}ms delay for rate limiting`);
        await new Promise(resolve => setTimeout(resolve, delay));

        // Call n8n webhook for enrichment
        const n8nWebhookUrl = 'https://n8n.getpro.co/webhook/f35b36ef-0f91-4587-aa4e-72bf302c565c';
        
        const n8nResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            linkedin_id: company.linkedin_id,
            account_id: accountId
          })
        });

        if (!n8nResponse.ok) {
          const errorText = await n8nResponse.text();
          console.error(`❌ n8n webhook error for ${company.linkedin_id}:`, n8nResponse.status, errorText);
          
          // Mark as error in queue
          await supabaseClient
            .from('company_enrichment_queue')
            .update({
              status: 'error',
              error_message: `n8n webhook error: ${n8nResponse.status} - ${errorText}`,
              updated_at: new Date().toISOString()
            })
            .eq('linkedin_id', company.linkedin_id);
          
          errors++;
          continue;
        }

        // Update company status
        await supabaseClient
          .from('companies')
          .update({
            enrichment_status: 'processing',
            enrichment_source: 'auto',
            last_updated_at: new Date().toISOString()
          })
          .eq('linkedin_id', company.linkedin_id);

        processed++;
        console.log(`✅ Enrichment triggered for ${company.linkedin_id}`);

      } catch (error: any) {
        console.error(`Error processing company ${company.linkedin_id}:`, error);
        errors++;
      }
    }

    // Clean up old queue entries
    await supabaseClient.rpc('cleanup_enrichment_queue');

    console.log(`🎉 Auto-enrichment completed: ${processed} processed, ${errors} errors`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Auto-enrichment completed',
      processed: processed,
      errors: errors,
      total: companiesToEnrich.length
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('💥 Error in auto-enrich-companies function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});


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
    const { companyLinkedInId, source = 'manual' } = await req.json();
    
    if (!companyLinkedInId) {
      return new Response(JSON.stringify({ error: 'Company LinkedIn ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🏢 Starting enrichment for company LinkedIn ID:', companyLinkedInId);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if company already exists and if enrichment is needed
    const { data: existingCompany, error: checkError } = await supabaseClient
      .from('companies')
      .select('*')
      .eq('linkedin_id', companyLinkedInId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing company:', checkError);
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if enrichment is needed (never enriched or older than 6 months)
    if (existingCompany?.last_enriched_at) {
      const lastEnriched = new Date(existingCompany.last_enriched_at);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      if (lastEnriched > sixMonthsAgo && source !== 'manual') {
        console.log('📋 Company recently enriched, skipping');
        return new Response(JSON.stringify({ 
          success: true, 
          data: existingCompany,
          cached: true,
          message: 'Company recently enriched'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

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

    // Select random account for load balancing
    const randomAccount = profiles[Math.floor(Math.random() * profiles.length)];
    const accountId = randomAccount.unipile_account_id;

    console.log('🔄 Using Unipile account:', accountId);

    // Add to enrichment queue
    const { error: queueError } = await supabaseClient
      .from('company_enrichment_queue')
      .insert({
        linkedin_id: companyLinkedInId,
        status: 'processing',
        source: source,
        account_id: accountId
      });

    if (queueError) {
      console.error('Error adding to queue:', queueError);
    }

    // Add random delay between 1-5 seconds to respect rate limits
    const delay = Math.floor(Math.random() * 4000) + 1000;
    console.log(`⏱️ Adding ${delay}ms delay for rate limiting`);
    await new Promise(resolve => setTimeout(resolve, delay));

    // Call n8n webhook for enrichment
    const n8nWebhookUrl = 'https://n8n.getpro.co/webhook/f35b36ef-0f91-4587-aa4e-72bf302c565c';
    
    console.log('🔗 Calling n8n webhook for enrichment...');
    console.log('📋 Payload:', { linkedin_id: companyLinkedInId, account_id: accountId });
    
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        linkedin_id: companyLinkedInId,
        account_id: accountId
      })
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('❌ n8n webhook error:', n8nResponse.status, errorText);
      
      // Mark as error in queue
      await supabaseClient
        .from('company_enrichment_queue')
        .update({
          status: 'error',
          error_message: `n8n webhook error: ${n8nResponse.status} - ${errorText}`,
          updated_at: new Date().toISOString()
        })
        .eq('linkedin_id', companyLinkedInId);
      
      return new Response(JSON.stringify({ 
        error: 'Failed to trigger enrichment workflow',
        details: errorText,
        status: n8nResponse.status
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const n8nResult = await n8nResponse.json();
    console.log('✅ n8n enrichment triggered successfully:', n8nResult);

    // Update company status
    await supabaseClient
      .from('companies')
      .update({
        enrichment_status: 'processing',
        enrichment_source: source,
        last_updated_at: new Date().toISOString()
      })
      .eq('linkedin_id', companyLinkedInId);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Enrichment workflow started',
      status: 'processing'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('💥 Error in enrich-company function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

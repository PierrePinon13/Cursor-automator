
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
    const { companyLinkedInId } = await req.json();
    
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

    // Check if company already exists in enrichment table
    const { data: existingEnrichment, error: checkError } = await supabaseClient
      .from('companies_enrichment')
      .select('*')
      .eq('linkedin_id', companyLinkedInId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing enrichment:', checkError);
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // If already enriched recently (less than 30 days), return cached data
    if (existingEnrichment) {
      const lastEnriched = new Date(existingEnrichment.enriched_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      if (lastEnriched > thirtyDaysAgo) {
        console.log('📋 Using cached enrichment data');
        return new Response(JSON.stringify({ 
          success: true, 
          data: existingEnrichment,
          cached: true 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Get available Unipile accounts (rotating accounts to avoid rate limits)
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

    // Add random delay between 1-5 seconds to respect rate limits
    const delay = Math.floor(Math.random() * 4000) + 1000;
    console.log(`⏱️ Adding ${delay}ms delay for rate limiting`);
    await new Promise(resolve => setTimeout(resolve, delay));

    // Call n8n webhook for enrichment - CORRECTION DE L'URL
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

    // If we get immediate results (synchronous response)
    if (n8nResult && Array.isArray(n8nResult) && n8nResult.length > 0) {
      const enrichmentData = n8nResult[0];
      
      // Save to enrichment table
      const saveData = {
        linkedin_id: companyLinkedInId,
        name: enrichmentData.name || null,
        description: enrichmentData.description || null,
        activities: enrichmentData.activities || null,
        employee_count: enrichmentData.employee_count || null,
        categorie: enrichmentData.categorie || null,
        enriched_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: savedData, error: saveError } = await supabaseClient
        .from('companies_enrichment')
        .upsert(saveData)
        .select()
        .single();

      if (saveError) {
        console.error('❌ Error saving enrichment data:', saveError);
        return new Response(JSON.stringify({ 
          error: 'Failed to save enrichment data' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log('💾 Enrichment data saved successfully');
      
      return new Response(JSON.stringify({ 
        success: true, 
        data: savedData,
        cached: false 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // If asynchronous response, return success with pending status
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Enrichment workflow started',
      status: 'pending'
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

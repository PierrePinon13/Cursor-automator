
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
    console.log('🕛 Starting daily client jobs trigger at 12:00 Paris time');

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer tous les clients avec tracking activé
    const { data: clients, error: clientsError } = await supabaseClient
      .from('clients')
      .select('company_linkedin_id')
      .eq('tracking_enabled', true)
      .not('company_linkedin_id', 'is', null);

    if (clientsError) {
      console.error('❌ Error fetching clients:', clientsError);
      return new Response(JSON.stringify({ 
        error: 'Error fetching clients',
        details: clientsError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!clients || clients.length === 0) {
      console.log('ℹ️ No clients with tracking enabled found');
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No clients with tracking enabled',
        clients_count: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extraire les LinkedIn IDs
    const linkedinIds = clients
      .map(client => client.company_linkedin_id)
      .filter(Boolean);

    console.log(`📋 Found ${linkedinIds.length} client LinkedIn IDs to process`);

    // Appeler le webhook n8n avec la liste des LinkedIn IDs
    const n8nWebhookUrl = 'https://n8n.getpro.co/webhook/0a5d3c6d-008c-481e-ba2f-727bd5366a20';
    
    console.log('🔗 Calling n8n webhook for daily job scraping...');
    console.log('📋 Payload LinkedIn IDs count:', linkedinIds.length);
    
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(linkedinIds)
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('❌ n8n webhook error:', n8nResponse.status, errorText);
      
      return new Response(JSON.stringify({ 
        error: 'Failed to trigger n8n job scraping workflow',
        details: errorText,
        status: n8nResponse.status,
        clients_processed: linkedinIds.length
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const n8nResult = await n8nResponse.json();
    console.log('✅ n8n daily job scraping triggered successfully:', n8nResult);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Daily client jobs scraping triggered successfully',
      clients_processed: linkedinIds.length,
      n8n_response: n8nResult
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('💥 Error in daily-client-jobs-trigger function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});


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
    const { linkedinUrl, publicIdentifier, entityType, entityId } = await req.json();
    
    if (!linkedinUrl && !publicIdentifier) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'LinkedIn URL or public identifier is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!entityType || !entityId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Entity type and ID are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🔍 Enriching company via LinkedIn URL/identifier:', { linkedinUrl, publicIdentifier, entityType, entityId });

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract public identifier from URL if not provided
    let identifier = publicIdentifier;
    if (!identifier && linkedinUrl) {
      const urlPattern = /linkedin\.com\/company\/([^\/\?]+)/i;
      const match = linkedinUrl.match(urlPattern);
      if (match && match[1]) {
        identifier = match[1];
      } else {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Could not extract company identifier from LinkedIn URL' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    console.log('📋 Using LinkedIn identifier:', identifier);

    // Get available Unipile account
    const { data: accounts, error: accountsError } = await supabaseClient
      .from('profiles')
      .select('unipile_account_id')
      .not('unipile_account_id', 'is', null)
      .limit(1);

    if (accountsError || !accounts?.length) {
      console.error('❌ No Unipile accounts available:', accountsError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No Unipile accounts available' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const accountId = accounts[0].unipile_account_id;
    console.log('✅ Using Unipile account:', accountId);

    // Call Unipile API to get company data
    const unipileApiKey = Deno.env.get('UNIPILE_API_KEY');
    if (!unipileApiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Unipile API key not configured' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Add random delay for rate limiting
    const delay = Math.floor(Math.random() * 3000) + 1000;
    console.log(`⏱️ Adding ${delay}ms delay for rate limiting`);
    await new Promise(resolve => setTimeout(resolve, delay));

    console.log('🌐 Calling Unipile API for company enrichment...');
    const unipileUrl = `https://api9.unipile.com:13946/api/v1/linkedin/company/${identifier}?account_id=${accountId}`;
    
    const unipileResponse = await fetch(unipileUrl, {
      method: 'GET',
      headers: {
        'X-API-KEY': unipileApiKey,
        'accept': 'application/json'
      }
    });

    if (!unipileResponse.ok) {
      const errorText = await unipileResponse.text();
      console.error('❌ Unipile API error:', unipileResponse.status, errorText);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Unipile API error: ${unipileResponse.status} - ${errorText}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const companyData = await unipileResponse.json();
    console.log('✅ Company data retrieved from Unipile');

    // Extract LinkedIn ID from company data
    const linkedinId = companyData.id || companyData.linkedin_id || companyData.urn?.split(':').pop();
    
    if (!linkedinId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Could not extract LinkedIn ID from company data' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('📝 Extracted LinkedIn ID:', linkedinId);

    // Update the entity (client or hr_provider) with the enriched data
    const tableName = entityType === 'client' ? 'clients' : 'hr_providers';
    const updateData = {
      company_linkedin_id: linkedinId,
      company_linkedin_url: linkedinUrl || `https://www.linkedin.com/company/${identifier}`,
      updated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabaseClient
      .from(tableName)
      .update(updateData)
      .eq('id', entityId);

    if (updateError) {
      console.error('❌ Error updating entity:', updateError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to update entity with enriched data' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Entity successfully enriched with LinkedIn data');

    return new Response(JSON.stringify({ 
      success: true, 
      linkedinId,
      companyData: {
        name: companyData.name,
        industry: companyData.industry,
        followerCount: companyData.followerCount || companyData.followers_count
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('💥 Error in enrich-company-linkedin function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});


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
    const { hrProviderId } = await req.json();
    
    if (!hrProviderId) {
      return new Response(JSON.stringify({ 
        error: 'HR Provider ID is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🔍 Filtering leads for HR provider:', hrProviderId);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the HR provider's LinkedIn ID
    const { data: hrProvider, error: hrError } = await supabaseClient
      .from('hr_providers')
      .select('company_linkedin_id, company_name')
      .eq('id', hrProviderId)
      .single();

    if (hrError || !hrProvider) {
      console.error('❌ Error fetching HR provider:', hrError);
      return new Response(JSON.stringify({ 
        error: 'HR provider not found' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!hrProvider.company_linkedin_id) {
      console.log('⚠️ HR provider has no LinkedIn ID, nothing to filter');
      return new Response(JSON.stringify({ 
        success: true, 
        filteredCount: 0, 
        message: 'HR provider has no LinkedIn ID' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🏢 Filtering leads for LinkedIn ID:', hrProvider.company_linkedin_id);

    // Find all leads that match this HR provider's LinkedIn ID
    const { data: matchingLeads, error: leadsError } = await supabaseClient
      .from('leads')
      .select('id, author_name, unipile_company')
      .eq('company_linkedin_id', hrProvider.company_linkedin_id)
      .neq('processing_status', 'filtered_hr_provider'); // Don't re-filter already filtered leads

    if (leadsError) {
      console.error('❌ Error fetching matching leads:', leadsError);
      return new Response(JSON.stringify({ 
        error: 'Error fetching matching leads' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📋 Found ${matchingLeads?.length || 0} leads to filter`);

    if (!matchingLeads || matchingLeads.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        filteredCount: 0, 
        message: 'No matching leads found' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update the leads to mark them as filtered
    const leadIds = matchingLeads.map(lead => lead.id);
    
    const { error: updateError } = await supabaseClient
      .from('leads')
      .update({
        processing_status: 'filtered_hr_provider',
        last_updated_at: new Date().toISOString()
      })
      .in('id', leadIds);

    if (updateError) {
      console.error('❌ Error updating leads:', updateError);
      return new Response(JSON.stringify({ 
        error: 'Error filtering leads' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Also update corresponding linkedin_posts if they exist
    const { error: postsUpdateError } = await supabaseClient
      .from('linkedin_posts')
      .update({
        processing_status: 'filtered_hr_provider',
        last_updated_at: new Date().toISOString()
      })
      .in('lead_id', leadIds);

    if (postsUpdateError) {
      console.error('⚠️ Error updating posts (non-critical):', postsUpdateError);
    }

    console.log(`✅ Successfully filtered ${leadIds.length} leads for HR provider: ${hrProvider.company_name}`);

    return new Response(JSON.stringify({ 
      success: true, 
      filteredCount: leadIds.length,
      hrProviderName: hrProvider.company_name,
      filteredLeads: matchingLeads.map(lead => ({
        id: lead.id,
        author_name: lead.author_name,
        company: lead.unipile_company
      }))
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('💥 Error in filter-hr-provider-leads function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

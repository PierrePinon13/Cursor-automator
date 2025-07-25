
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CompanyInfo {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  companySize?: string;
  headquarters?: string;
  website?: string;
  followerCount?: number;
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

    console.log('🏢 Fetching company info for LinkedIn ID:', companyLinkedInId);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if company already exists in database
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

    // Si l'entreprise existe et est complète (a une description et une taille), on garde
    if (existingCompany && existingCompany.description && existingCompany.company_size) {
      const lastUpdated = new Date(existingCompany.last_updated_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      if (lastUpdated > thirtyDaysAgo) {
        console.log('📋 Using cached company info');
        return new Response(JSON.stringify({ 
          success: true, 
          company: existingCompany,
          cached: true 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Add random delay between 2-8 seconds for rate limiting
    const delay = Math.floor(Math.random() * 6000) + 2000;
    console.log(`⏱️ Adding ${delay}ms delay before Unipile company call`);
    await new Promise(resolve => setTimeout(resolve, delay));

    // Fetch from Unipile API
    const unipileApiKey = Deno.env.get('UNIPILE_API_KEY');
    if (!unipileApiKey) {
      console.error('❌ UNIPILE_API_KEY not found');
      return new Response(JSON.stringify({ error: 'Unipile API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🔗 Calling Unipile company API for:', companyLinkedInId);
    
    // Valider que l'ID LinkedIn est un string valide
    const linkedInIdString = String(companyLinkedInId);
    if (!linkedInIdString || linkedInIdString === 'null' || linkedInIdString === 'undefined') {
      console.error('❌ Invalid LinkedIn ID:', companyLinkedInId);
      return new Response(JSON.stringify({ 
        error: 'Invalid LinkedIn ID provided',
        linkedin_id: companyLinkedInId
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Utiliser le bon DSN api9.unipile.com:13946
    const unipileResponse = await fetch(`https://api9.unipile.com:13946/api/v1/linkedin/company/${linkedInIdString}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'X-API-KEY': unipileApiKey
      }
    });

    if (!unipileResponse.ok) {
      const errorText = await unipileResponse.text();
      console.error('❌ Unipile company API error:', unipileResponse.status, unipileResponse.statusText, errorText);
      
      // Si c'est une erreur 400, créer quand même une entrée basique
      if (unipileResponse.status === 400) {
        console.log('⚠️ Creating basic company entry due to API error');
        const basicCompanyData = {
          linkedin_id: linkedInIdString,
          name: `Company ${linkedInIdString}`,
          description: 'Information not available from LinkedIn',
          industry: null,
          company_size: null,
          headquarters: null,
          website: null,
          follower_count: null,
          unipile_data: { error: errorText },
          last_updated_at: new Date().toISOString()
        };

        let company;
        if (existingCompany) {
          const { data: updatedCompany, error: updateError } = await supabaseClient
            .from('companies')
            .update(basicCompanyData)
            .eq('linkedin_id', linkedInIdString)
            .select()
            .single();

          if (updateError) {
            console.error('❌ Error updating basic company:', updateError);
          } else {
            company = updatedCompany;
          }
        } else {
          const { data: newCompany, error: insertError } = await supabaseClient
            .from('companies')
            .insert(basicCompanyData)
            .select()
            .single();

          if (insertError) {
            console.error('❌ Error creating basic company:', insertError);
          } else {
            company = newCompany;
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          company,
          cached: false,
          warning: 'Limited data due to API error'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch company info from Unipile',
        status: unipileResponse.status,
        details: errorText
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const unipileData = await unipileResponse.json();
    console.log('✅ Successfully fetched company data from Unipile');
    console.log('🏢 Company data keys:', Object.keys(unipileData));

    // Extract relevant information
    const companyInfo: CompanyInfo = {
      id: linkedInIdString,
      name: unipileData.name || `Company ${linkedInIdString}`,
      description: unipileData.description || unipileData.about || '',
      industry: unipileData.industry || '',
      companySize: unipileData.companySize || unipileData.company_size || '',
      headquarters: unipileData.headquarters || unipileData.location || '',
      website: unipileData.website || '',
      followerCount: unipileData.followerCount || unipileData.followers_count || 0
    };

    // Save or update company in database
    const companyData = {
      linkedin_id: linkedInIdString,
      name: companyInfo.name,
      description: companyInfo.description,
      industry: companyInfo.industry,
      company_size: companyInfo.companySize,
      headquarters: companyInfo.headquarters,
      website: companyInfo.website,
      follower_count: companyInfo.followerCount,
      unipile_data: unipileData,
      last_updated_at: new Date().toISOString()
    };

    let company;
    if (existingCompany) {
      // Update existing company
      const { data: updatedCompany, error: updateError } = await supabaseClient
        .from('companies')
        .update(companyData)
        .eq('linkedin_id', linkedInIdString)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating company:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to update company' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      company = updatedCompany;
      console.log('📝 Company info updated successfully');
    } else {
      // Insert new company
      const { data: newCompany, error: insertError } = await supabaseClient
        .from('companies')
        .insert(companyData)
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error inserting company:', insertError);
        return new Response(JSON.stringify({ error: 'Failed to save company' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      company = newCompany;
      console.log('💾 New company info saved successfully');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      company,
      cached: false 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('💥 Error in fetch-company-info function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});


import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactScrapingRequest {
  contact_id: string;
  profile_url: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { contact_id, profile_url }: ContactScrapingRequest = await req.json();

    console.log('🔗 Starting LinkedIn profile extraction for contact:', contact_id);
    console.log('📱 Profile URL:', profile_url);

    // Extract LinkedIn profile ID from URL
    const profileIdMatch = profile_url.match(/\/in\/([^\/\?]+)/);
    if (!profileIdMatch) {
      throw new Error('Invalid LinkedIn profile URL format');
    }
    
    const profileId = profileIdMatch[1];
    console.log('👤 Profile ID extracted:', profileId);

    // Call Unipile API to scrape profile
    const unipileResponse = await fetch('https://api.unipile.com/api/v1/profiles', {
      method: 'POST',
      headers: {
        'X-API-KEY': Deno.env.get('UNIPILE_API_KEY') ?? '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        profile_id: profileId,
        provider: 'linkedin'
      })
    });

    if (!unipileResponse.ok) {
      const errorText = await unipileResponse.text();
      throw new Error(`Unipile API error: ${unipileResponse.status} - ${errorText}`);
    }

    const unipileData = await unipileResponse.json();
    console.log('✅ Unipile data received:', JSON.stringify(unipileData, null, 2));

    // Extract relevant information from Unipile response
    const extractedData = {
      linkedin_profile_id: profileId,
      unipile_data: unipileData,
      unipile_extracted_at: new Date().toISOString()
    };

    // Update contact with additional info if available
    const updates: any = { ...extractedData };
    
    if (unipileData.first_name && !updates.first_name) {
      updates.first_name = unipileData.first_name;
    }
    if (unipileData.last_name && !updates.last_name) {
      updates.last_name = unipileData.last_name;
    }
    if (unipileData.headline && !updates.position) {
      updates.position = unipileData.headline;
    }

    // Update the contact in database
    const { error: updateError } = await supabase
      .from('client_contacts')
      .update(updates)
      .eq('id', contact_id);

    if (updateError) {
      throw updateError;
    }

    console.log('✅ Contact updated successfully with LinkedIn data');

    return new Response(
      JSON.stringify({ 
        success: true, 
        extracted_data: extractedData,
        message: 'LinkedIn profile data extracted and saved successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error in contact scraping:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

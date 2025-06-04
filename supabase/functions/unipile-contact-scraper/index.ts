
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

    // Get available Unipile account
    const { data: accounts, error: accountsError } = await supabase
      .from('profiles')
      .select('unipile_account_id')
      .not('unipile_account_id', 'is', null)
      .limit(1);

    if (accountsError || !accounts || accounts.length === 0) {
      console.error('❌ No Unipile accounts available:', accountsError);
      throw new Error('No Unipile accounts available for scraping');
    }

    const accountId = accounts[0].unipile_account_id;
    console.log('✅ Using Unipile account:', accountId);

    // Call unipile-queue for profile scraping
    console.log('🌐 Calling unipile-queue for profile scraping...');
    const { data: queueResult, error: queueError } = await supabase.functions.invoke('unipile-queue', {
      body: {
        action: 'execute',
        account_id: accountId,
        operation: 'scrape_profile',
        payload: {
          authorProfileId: profileId
        },
        priority: false
      }
    });

    if (queueError || !queueResult?.success) {
      console.error('❌ Error calling unipile-queue:', queueError || queueResult?.error);
      throw new Error(`Failed to scrape profile: ${queueError?.message || queueResult?.error || 'Unknown error'}`);
    }

    const unipileData = queueResult.result;
    console.log('✅ Unipile scraping successful');
    console.log('📊 Profile data keys:', Object.keys(unipileData));

    // Extract relevant information from Unipile response
    let firstName = '';
    let lastName = '';
    let email = '';
    let phone = '';
    let position = '';

    // Extract name
    if (unipileData.first_name) {
      firstName = unipileData.first_name;
    }
    if (unipileData.last_name) {
      lastName = unipileData.last_name;
    }

    // Extract email
    if (unipileData.email) {
      email = unipileData.email;
    }

    // Extract phone
    if (unipileData.phone_numbers && unipileData.phone_numbers.length > 0) {
      phone = unipileData.phone_numbers[0];
    }

    // Extract position/headline
    if (unipileData.headline) {
      position = unipileData.headline;
    }

    console.log('📋 Extracted data:', {
      firstName,
      lastName,
      email: email ? 'Found' : 'Not found',
      phone: phone ? 'Found' : 'Not found',
      position
    });

    // Extract work experience (5 companies max)
    const experiences = unipileData.work_experience || unipileData.linkedin_profile?.experience || [];
    console.log('💼 Found', experiences.length, 'work experiences');
    
    // Prepare company data for direct column storage
    const companyData: any = {};
    
    for (let i = 0; i < Math.min(experiences.length, 5); i++) {
      const exp = experiences[i];
      const companyIndex = i + 1;
      
      companyData[`company_${companyIndex}_name`] = exp.company || exp.companyName || '';
      companyData[`company_${companyIndex}_position`] = exp.position || exp.title || '';
      companyData[`company_${companyIndex}_start_date`] = exp.start || exp.startDate || null;
      companyData[`company_${companyIndex}_end_date`] = exp.end || exp.endDate || null;
      companyData[`company_${companyIndex}_is_current`] = !exp.end || exp.end === null || exp.end === '';
      companyData[`company_${companyIndex}_duration_months`] = calculateDurationInMonths(
        exp.start || exp.startDate, 
        exp.end || exp.endDate
      );
      
      // Extract LinkedIn ID and URL for the company
      if (exp.company_id || exp.companyId) {
        companyData[`company_${companyIndex}_linkedin_id`] = exp.company_id || exp.companyId;
        companyData[`company_${companyIndex}_linkedin_url`] = `https://www.linkedin.com/company/${exp.company_id || exp.companyId}`;
      } else if (exp.company_url) {
        companyData[`company_${companyIndex}_linkedin_url`] = exp.company_url;
        // Try to extract ID from URL
        const idMatch = exp.company_url.match(/\/company\/([^\/\?]+)/);
        if (idMatch) {
          companyData[`company_${companyIndex}_linkedin_id`] = idMatch[1];
        }
      }
    }

    // Prepare extracted data
    const extractedData = {
      linkedin_profile_id: profileId,
      unipile_data: unipileData,
      unipile_extracted_at: new Date().toISOString(),
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      phone: phone || null,
      position: position || null,
      ...companyData
    };

    // Si on a un vrai contact_id (pas "temp"), on met à jour en base
    if (contact_id !== 'temp') {
      console.log('💾 Updating contact in database...');
      
      const { error: updateError } = await supabase
        .from('client_contacts')
        .update(extractedData)
        .eq('id', contact_id);

      if (updateError) {
        console.error('❌ Error updating contact:', updateError);
        throw updateError;
      }

      console.log('✅ Contact updated successfully with LinkedIn data and work history');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        extracted_data: extractedData,
        message: 'LinkedIn profile data extracted successfully with work history'
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

function calculateDurationInMonths(startDate: string | null, endDate: string | null): number | null {
  if (!startDate) return null;
  
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  
  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  
  return yearDiff * 12 + monthDiff;
}

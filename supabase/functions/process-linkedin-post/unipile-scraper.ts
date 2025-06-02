
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ProcessingContext } from './types.ts';

export interface UnipileScrapingResult {
  success: boolean;
  company?: string;
  position?: string;
  company_id?: string;
  phone?: string;
  error?: string;
  raw_data?: any;
}

export async function scrapeLinkedInProfile(
  unipileApiKey: string,
  profileId: string,
  accountId?: string
): Promise<UnipileScrapingResult> {
  console.log('🔍 Starting Unipile profile scraping for profile ID:', profileId);
  console.log('🔑 Using account ID:', accountId || 'not provided');
  
  try {
    // ✅ CORRECTION : Utiliser l'URL exacte avec les paramètres requis
    let apiUrl = `https://api9.unipile.com:13946/api/v1/users/${profileId}`;
    const queryParams = new URLSearchParams();
    
    // Ajouter les paramètres de requête
    if (accountId) {
      queryParams.append('account_id', accountId);
    }
    queryParams.append('linkedin_sections', 'experience');
    
    if (queryParams.toString()) {
      apiUrl += `?${queryParams.toString()}`;
    }
    
    console.log('🌐 API URL:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-API-KEY': unipileApiKey,
        'accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Unipile API error:', response.status, response.statusText, errorText);
      return {
        success: false,
        error: `Unipile API error: ${response.status} ${response.statusText} - ${errorText}`
      };
    }

    const data = await response.json();
    console.log('✅ Unipile scraping successful');
    console.log('📊 Profile data keys:', Object.keys(data));

    // Extract relevant information using the same logic as specialized workers
    let company = null;
    let position = null;
    let company_id = null;
    
    // Extraire les informations depuis l'expérience
    const experiences = data.work_experience || data.linkedin_profile?.experience || [];
    
    if (experiences.length > 0) {
      // Trouver l'expérience actuelle
      const currentExperience = experiences.find((exp: any) => 
        !exp.end || exp.end === null || exp.end === ''
      ) || experiences[0];

      if (currentExperience) {
        company = currentExperience.company || currentExperience.companyName || null;
        position = currentExperience.position || currentExperience.title || null;
        company_id = currentExperience.company_id || currentExperience.companyId || null;
      }
    }

    const phone = data.phone_numbers?.[0] || data.phone;

    console.log('📋 Extracted data:', {
      company: company || 'N/A',
      position: position || 'N/A',
      company_id: company_id || 'N/A',
      phone: phone ? 'Found' : 'Not found'
    });

    return {
      success: true,
      company,
      position,
      company_id,
      phone,
      raw_data: data
    };

  } catch (error: any) {
    console.error('❌ Error during Unipile scraping:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during scraping'
    };
  }
}

async function getAvailableUnipileAccount(supabaseClient: any): Promise<string | null> {
  console.log('🔍 Fetching available Unipile accounts...');
  
  const { data: accounts, error } = await supabaseClient
    .from('profiles')
    .select('unipile_account_id')
    .not('unipile_account_id', 'is', null);

  if (error) {
    console.error('❌ Error fetching Unipile accounts:', error);
    return null;
  }

  if (!accounts || accounts.length === 0) {
    console.error('❌ No Unipile accounts found');
    return null;
  }

  // Pour l'instant, prendre le premier compte disponible
  const selectedAccount = accounts[0].unipile_account_id;
  console.log('✅ Selected Unipile account:', selectedAccount);
  
  return selectedAccount;
}

export async function executeUnipileScraping(
  context: ProcessingContext
): Promise<UnipileScrapingResult> {
  try {
    console.log('🔍 Step 4: Unipile profile scraping starting...');
    console.log('📝 Post ID:', context.postId);
    console.log('👤 Profile ID:', context.post.author_profile_id);
    
    if (!context.post.author_profile_id) {
      console.log('⚠️ No author_profile_id available for scraping');
      return {
        success: false,
        error: 'No author_profile_id available for scraping'
      };
    }
    
    // ✅ NOUVEAU : Récupérer un compte Unipile disponible
    const accountId = await getAvailableUnipileAccount(context.supabaseClient);
    if (!accountId) {
      console.error('❌ No Unipile account available for scraping');
      return {
        success: false,
        error: 'No Unipile account available for scraping'
      };
    }
    
    const scrapingResult = await scrapeLinkedInProfile(
      context.unipileApiKey,
      context.post.author_profile_id,
      accountId
    );

    // Update the post with scraping results
    const updateData: any = {
      unipile_profile_scraped: scrapingResult.success,
      unipile_profile_scraped_at: new Date().toISOString(),
      unipile_response: scrapingResult.raw_data || null
    };

    if (scrapingResult.success) {
      updateData.unipile_company = scrapingResult.company;
      updateData.unipile_position = scrapingResult.position;
      updateData.unipile_company_linkedin_id = scrapingResult.company_id;
      
      if (scrapingResult.phone) {
        updateData.phone_number = scrapingResult.phone;
        updateData.phone_retrieved_at = new Date().toISOString();
      }
      
      console.log('💾 Saving Unipile data to post:', {
        company: scrapingResult.company,
        position: scrapingResult.position,
        company_id: scrapingResult.company_id
      });
    } else {
      console.log('⚠️ Unipile scraping failed, saving null values');
    }

    const { error: updateError } = await context.supabaseClient
      .from('linkedin_posts')
      .update(updateData)
      .eq('id', context.postId);

    if (updateError) {
      console.error('❌ Error updating post with scraping results:', updateError);
    } else {
      console.log('✅ Unipile scraping results saved to database');
    }

    if (scrapingResult.success) {
      console.log('✅ Step 4 completed successfully');
    } else {
      console.log('⚠️ Step 4 completed with errors:', scrapingResult.error);
    }

    return scrapingResult;

  } catch (error: any) {
    console.error('❌ Error in Unipile scraping step:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during Unipile scraping step'
    };
  }
}

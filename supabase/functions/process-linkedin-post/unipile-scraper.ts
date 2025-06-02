
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

function extractProfileData(unipileData: any) {
  let company = null;
  let position = null;
  let company_id = null;
  
  // Extraire les informations depuis l'expérience
  const experiences = unipileData.work_experience || unipileData.linkedin_profile?.experience || [];
  
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

  const phone = unipileData.phone_numbers?.[0] || unipileData.phone;

  return { company, position, company_id, phone };
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
    
    // Récupérer un compte Unipile disponible
    const accountId = await getAvailableUnipileAccount(context.supabaseClient);
    if (!accountId) {
      console.error('❌ No Unipile account available for scraping');
      return {
        success: false,
        error: 'No Unipile account available for scraping'
      };
    }
    
    // Appeler unipile-queue pour le scraping de profil
    console.log('🌐 Calling unipile-queue for profile scraping...');
    const { data: queueResult, error: queueError } = await context.supabaseClient.functions.invoke('unipile-queue', {
      body: {
        action: 'execute',
        account_id: accountId,
        operation: 'scrape_profile',
        payload: {
          authorProfileId: context.post.author_profile_id
        },
        priority: false
      }
    });

    if (queueError || !queueResult?.success) {
      console.error('❌ Error calling unipile-queue for profile scraping:', queueError || queueResult?.error);
      return {
        success: false,
        error: `Failed to scrape profile via unipile-queue: ${queueError?.message || queueResult?.error || 'Unknown error'}`
      };
    }

    const unipileData = queueResult.result;
    console.log('✅ Unipile scraping successful via unipile-queue');
    console.log('📊 Profile data keys:', Object.keys(unipileData));

    // Extract relevant information
    const extractedData = extractProfileData(unipileData);

    console.log('📋 Extracted data:', {
      company: extractedData.company || 'N/A',
      position: extractedData.position || 'N/A',
      company_id: extractedData.company_id || 'N/A',
      phone: extractedData.phone ? 'Found' : 'Not found'
    });

    // Update the post with scraping results
    const updateData: any = {
      unipile_profile_scraped: true,
      unipile_profile_scraped_at: new Date().toISOString(),
      unipile_response: unipileData,
      unipile_company: extractedData.company,
      unipile_position: extractedData.position,
      unipile_company_linkedin_id: extractedData.company_id
    };

    if (extractedData.phone) {
      updateData.phone_number = extractedData.phone;
      updateData.phone_retrieved_at = new Date().toISOString();
    }

    console.log('💾 Saving Unipile data to post:', {
      company: extractedData.company,
      position: extractedData.position,
      company_id: extractedData.company_id
    });

    const { error: updateError } = await context.supabaseClient
      .from('linkedin_posts')
      .update(updateData)
      .eq('id', context.postId);

    if (updateError) {
      console.error('❌ Error updating post with scraping results:', updateError);
    } else {
      console.log('✅ Unipile scraping results saved to database');
    }

    console.log('✅ Step 4 completed successfully');

    return {
      success: true,
      company: extractedData.company,
      position: extractedData.position,
      company_id: extractedData.company_id,
      phone: extractedData.phone,
      raw_data: unipileData
    };

  } catch (error: any) {
    console.error('❌ Error in Unipile scraping step:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during Unipile scraping step'
    };
  }
}


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
  profileId: string
): Promise<UnipileScrapingResult> {
  console.log('🔍 Starting Unipile profile scraping for profile ID:', profileId);
  
  try {
    // ✅ CORRECTION : Utiliser la nouvelle API GET comme dans les workers spécialisés
    const response = await fetch(`https://api9.unipile.com:13946/api/v1/users/${profileId}?linkedin_sections=experience`, {
      method: 'GET',
      headers: {
        'X-API-KEY': unipileApiKey,
        'Content-Type': 'application/json',
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
    
    const scrapingResult = await scrapeLinkedInProfile(
      context.unipileApiKey,
      context.post.author_profile_id
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
    }

    const { error: updateError } = await context.supabaseClient
      .from('linkedin_posts')
      .update(updateData)
      .eq('id', context.postId);

    if (updateError) {
      console.error('❌ Error updating post with scraping results:', updateError);
    } else {
      console.log('💾 Unipile scraping results saved to database');
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

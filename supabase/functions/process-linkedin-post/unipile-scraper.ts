
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
  profileUrl: string
): Promise<UnipileScrapingResult> {
  console.log('🔍 Starting Unipile profile scraping for URL:', profileUrl);
  
  try {
    const response = await fetch('https://api.unipile.com/api/v1/profiles/scrape', {
      method: 'POST',
      headers: {
        'X-API-KEY': unipileApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider_id: 'LINKEDIN',
        url: profileUrl
      }),
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

    // Extract relevant information
    const company = data.current_position?.company?.name || data.company?.name;
    const position = data.current_position?.title || data.position;
    const company_id = data.current_position?.company?.linkedin_id || data.company?.linkedin_id;
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
    console.log('👤 Profile URL:', context.post.author_profile_url);
    
    const scrapingResult = await scrapeLinkedInProfile(
      context.unipileApiKey,
      context.post.author_profile_url
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

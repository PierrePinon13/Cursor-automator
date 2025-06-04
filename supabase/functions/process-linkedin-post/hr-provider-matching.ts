
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ProcessingContext } from './types.ts';
import { UnipileScrapingResult } from './unipile-scraper.ts';

export interface HrProviderMatchResult {
  isHrProviderLead: boolean;
  hrProviderId?: string;
  hrProviderName?: string;
}

export async function checkIfLeadIsFromHrProvider(
  supabaseClient: ReturnType<typeof createClient>,
  companyLinkedInId: string | null
): Promise<HrProviderMatchResult> {
  if (!companyLinkedInId) {
    console.log('No company LinkedIn ID provided for HR provider matching');
    return { isHrProviderLead: false };
  }

  try {
    console.log('Checking if company LinkedIn ID matches any HR provider:', companyLinkedInId);
    
    const { data: matchingHrProvider, error } = await supabaseClient
      .from('hr_providers')
      .select('id, company_name, company_linkedin_id')
      .eq('company_linkedin_id', companyLinkedInId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking HR provider match:', error);
      return { isHrProviderLead: false };
    }

    if (matchingHrProvider) {
      console.log('Lead matches HR provider:', matchingHrProvider.company_name);
      return {
        isHrProviderLead: true,
        hrProviderId: matchingHrProvider.id,
        hrProviderName: matchingHrProvider.company_name
      };
    }

    console.log('No HR provider match found for company LinkedIn ID:', companyLinkedInId);
    return { isHrProviderLead: false };

  } catch (error) {
    console.error('Error in HR provider matching:', error);
    return { isHrProviderLead: false };
  }
}

export async function executeHrProviderMatching(
  context: ProcessingContext,
  scrapingResult: UnipileScrapingResult
): Promise<HrProviderMatchResult> {
  try {
    console.log('🏢 Step 6: HR Provider matching...');
    
    // Use the company LinkedIn ID from scraping result
    const companyLinkedInId = scrapingResult.company_id;
    
    const hrProviderMatch = await checkIfLeadIsFromHrProvider(
      context.supabaseClient,
      companyLinkedInId
    );

    // Update the post with HR provider matching information
    const { error: updateError } = await context.supabaseClient
      .from('linkedin_posts')
      .update({
        is_hr_provider_lead: hrProviderMatch.isHrProviderLead,
        matched_hr_provider_id: hrProviderMatch.hrProviderId || null,
        matched_hr_provider_name: hrProviderMatch.hrProviderName || null
      })
      .eq('id', context.postId);

    if (updateError) {
      console.error('Error updating post with HR provider match info:', updateError);
    }

    if (hrProviderMatch.isHrProviderLead) {
      console.log('🚫 HR Provider lead identified - will be filtered:', hrProviderMatch.hrProviderName);
      
      // Mark the post as filtered due to HR provider match
      const { error: filterError } = await context.supabaseClient
        .from('linkedin_posts')
        .update({
          processing_status: 'filtered_hr_provider',
          last_updated_at: new Date().toISOString()
        })
        .eq('id', context.postId);

      if (filterError) {
        console.error('Error marking post as filtered:', filterError);
      }
    } else {
      console.log('ℹ️ Not an HR provider lead, continuing with regular processing');
    }

    return hrProviderMatch;

  } catch (error: any) {
    console.error('❌ Error in HR provider matching step:', error);
    return { isHrProviderLead: false };
  }
}

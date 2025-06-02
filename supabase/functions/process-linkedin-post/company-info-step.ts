
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ProcessingContext } from './types.ts';

export interface CompanyInfoResult {
  success: boolean;
  companyId?: string;
  companyInfo?: any;
  error?: string;
}

async function getAvailableUnipileAccount(supabaseClient: any): Promise<string | null> {
  console.log('🔍 Fetching available Unipile accounts for company scraping...');
  
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

  // Prendre le premier compte disponible
  const selectedAccount = accounts[0].unipile_account_id;
  console.log('✅ Selected Unipile account for company scraping:', selectedAccount);
  
  return selectedAccount;
}

export async function executeCompanyInfoStep(
  context: ProcessingContext,
  scrapingResult: any
): Promise<CompanyInfoResult> {
  try {
    // Check if we have a company LinkedIn ID from the scraping result
    const companyLinkedInId = scrapingResult.company_id;
    
    if (!companyLinkedInId) {
      console.log('⚠️ No company LinkedIn ID found, skipping company info step');
      return {
        success: true, // Not an error, just no company to fetch
        companyId: null
      };
    }

    console.log('🏢 Starting company info step for LinkedIn ID:', companyLinkedInId);

    // Get available Unipile account
    const accountId = await getAvailableUnipileAccount(context.supabaseClient);
    if (!accountId) {
      console.error('❌ No Unipile account available for company scraping');
      return {
        success: false,
        error: 'No Unipile account available for company scraping'
      };
    }

    // Call the unipile-queue function for company scraping
    console.log('🌐 Calling unipile-queue for company scraping...');
    const { data: queueResult, error: queueError } = await context.supabaseClient.functions.invoke('unipile-queue', {
      body: {
        action: 'execute',
        account_id: accountId,
        operation: 'scrape_company',
        payload: {
          companyLinkedInId: companyLinkedInId
        },
        priority: false
      }
    });

    if (queueError || !queueResult?.success) {
      console.error('❌ Error calling unipile-queue for company scraping:', queueError || queueResult?.error);
      return {
        success: false,
        error: `Failed to scrape company via unipile-queue: ${queueError?.message || queueResult?.error || 'Unknown error'}`
      };
    }

    const unipileData = queueResult.result;
    console.log('✅ Company info step completed successfully via unipile-queue');
    console.log('🏢 Company info retrieved:', {
      name: unipileData.name,
      industry: unipileData.industry,
      followerCount: unipileData.followerCount || unipileData.followers_count
    });

    // Extract relevant information
    const companyInfo = {
      id: companyLinkedInId,
      name: unipileData.name || '',
      description: unipileData.description || unipileData.about || '',
      industry: unipileData.industry || '',
      companySize: unipileData.companySize || unipileData.company_size || '',
      headquarters: unipileData.headquarters || unipileData.location || '',
      website: unipileData.website || '',
      followerCount: unipileData.followerCount || unipileData.followers_count || 0
    };

    // Save company data to database via existing companies table
    const companyData = {
      linkedin_id: companyLinkedInId,
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

    // Check if company already exists
    const { data: existingCompany, error: checkError } = await context.supabaseClient
      .from('companies')
      .select('*')
      .eq('linkedin_id', companyLinkedInId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing company:', checkError);
    }

    let savedCompany;
    if (existingCompany) {
      // Update existing company
      const { data: updatedCompany, error: updateError } = await context.supabaseClient
        .from('companies')
        .update(companyData)
        .eq('linkedin_id', companyLinkedInId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating company:', updateError);
      } else {
        savedCompany = updatedCompany;
        console.log('📝 Company info updated successfully');
      }
    } else {
      // Insert new company
      const { data: newCompany, error: insertError } = await context.supabaseClient
        .from('companies')
        .insert(companyData)
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error inserting company:', insertError);
      } else {
        savedCompany = newCompany;
        console.log('💾 New company info saved successfully');
      }
    }

    return {
      success: true,
      companyId: savedCompany?.id || companyLinkedInId,
      companyInfo: savedCompany || companyInfo
    };

  } catch (error: any) {
    console.error('❌ Error in company info step:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during company info fetch'
    };
  }
}

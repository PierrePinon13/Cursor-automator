
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ProcessingContext } from './types.ts';

export interface CompanyInfoResult {
  success: boolean;
  companyId?: string;
  companyInfo?: any;
  error?: string;
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

    // ✅ CORRECTION : Utiliser l'URL complète avec le bon DSN
    const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/fetch-company-info`;
    console.log('🌐 Calling company info function:', functionUrl);

    // Call the fetch-company-info function
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        companyLinkedInId: companyLinkedInId
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error calling fetch-company-info function:', response.status, errorText);
      return {
        success: false,
        error: `Failed to fetch company info: ${response.status} - ${errorText}`
      };
    }

    const result = await response.json();
    
    if (!result.success) {
      console.error('❌ Company info fetch failed:', result.error);
      return {
        success: false,
        error: result.error
      };
    }

    console.log('✅ Company info step completed successfully');
    console.log('🏢 Company info retrieved:', {
      id: result.company.id,
      name: result.company.name,
      industry: result.company.industry
    });

    return {
      success: true,
      companyId: result.company.id,
      companyInfo: result.company
    };

  } catch (error: any) {
    console.error('❌ Error in company info step:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during company info fetch'
    };
  }
}

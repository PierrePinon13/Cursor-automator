
import { ProcessingContext } from './types.ts';
import { executeOpenAIStep1 } from './openai-step1.ts';
import { executeOpenAIStep2 } from './openai-step2.ts';
import { executeOpenAIStep3 } from './openai-step3.ts';
import { executeUnipileScraping } from './unipile-scraper.ts';
import { executeClientMatching } from './client-matching.ts';
import { executeMessageGeneration } from './message-generation.ts';
import { executeLeadDeduplication } from './lead-deduplication.ts';
import { createOrUpdateLead } from './lead-creation.ts';
import { executeCompanyInfoStep } from './company-info-step.ts';

// Export all the individual step execution functions
export {
  executeOpenAIStep1,
  executeOpenAIStep2,
  executeOpenAIStep3,
  executeUnipileScraping,
  executeClientMatching,
  executeMessageGeneration,
  executeLeadDeduplication,
  executeCompanyInfoStep
};

// Execute lead creation with company info
export async function executeLeadCreation(
  context: ProcessingContext,
  step3Result: any,
  scrapingResult: any,
  clientMatch: any,
  approachMessage?: string
) {
  try {
    // First, execute company info step
    console.log('🏢 Starting company info step...');
    const companyInfoResult = await executeCompanyInfoStep(context, scrapingResult);
    
    if (!companyInfoResult.success) {
      console.log('⚠️ Company info step failed, but continuing with lead creation:', companyInfoResult.error);
    } else {
      console.log('✅ Company info step completed successfully');
    }

    // Then create the lead with company reference
    console.log('👤 Creating lead with company info...');
    const leadResult = await createOrUpdateLead(
      context.supabaseClient,
      {
        ...context.post,
        ...step3Result
      },
      scrapingResult,
      clientMatch,
      companyInfoResult,
      approachMessage
    );

    return leadResult;
  } catch (error: any) {
    console.error('❌ Error in executeLeadCreation:', error);
    return {
      success: false,
      action: 'error',
      error: error.message || 'Unknown error during lead creation process'
    };
  }
}


import { ProcessingContext } from './types.ts';
import { executeOpenAIStep1 } from './openai-step1.ts';
import { executeOpenAIStep2 } from './openai-step2.ts';
import { executeOpenAIStep3 } from './openai-step3.ts';
import { executeUnipileScraping } from './unipile-scraper.ts';
import { executeClientMatching } from './client-matching.ts';
import { executeMessageGeneration } from './message-generation.ts';
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
  executeCompanyInfoStep
};

// ✅ SIMPLIFICATION : Fusionner création et déduplication en une seule étape
export async function executeLeadCreation(
  context: ProcessingContext,
  step3Result: any,
  scrapingResult: any,
  clientMatch: any,
  approachMessage?: string
) {
  try {
    console.log('🏗️ Starting unified lead creation/update step...');
    
    // ✅ CORRECTION : Mettre à jour le post avec les données step3 AVANT la création du lead
    console.log('📝 Updating post with step3 data before lead creation...');
    const { error: step3UpdateError } = await context.supabaseClient
      .from('linkedin_posts')
      .update({
        openai_step3_categorie: step3Result.categorie,
        openai_step3_postes_selectionnes: step3Result.postes_selectionnes,
        openai_step3_justification: step3Result.justification,
        approach_message: approachMessage || null,
        approach_message_generated: !!approachMessage,
        approach_message_generated_at: approachMessage ? new Date().toISOString() : null,
        last_updated_at: new Date().toISOString()
      })
      .eq('id', context.postId);

    if (step3UpdateError) {
      console.error('❌ Error updating post with step3 data:', step3UpdateError);
    } else {
      console.log('✅ Post updated with step3 data');
    }

    // Récupérer le post mis à jour pour avoir toutes les données
    console.log('📥 Fetching updated post data...');
    const { data: updatedPost, error: fetchError } = await context.supabaseClient
      .from('linkedin_posts')
      .select('*')
      .eq('id', context.postId)
      .single();

    if (fetchError || !updatedPost) {
      console.error('❌ Error fetching updated post:', fetchError);
      return {
        success: false,
        action: 'error',
        error: 'Failed to fetch updated post data'
      };
    }

    console.log('📊 Updated post data verification:', {
      categorie: updatedPost.openai_step3_categorie,
      postes: updatedPost.openai_step3_postes_selectionnes,
      company: updatedPost.unipile_company,
      position: updatedPost.unipile_position
    });

    // First, execute company info step
    console.log('🏢 Starting company info step...');
    const companyInfoResult = await executeCompanyInfoStep(context, scrapingResult);
    
    if (!companyInfoResult.success) {
      console.log('⚠️ Company info step failed, but continuing with lead creation:', companyInfoResult.error);
    } else {
      console.log('✅ Company info step completed successfully');
    }

    // Then create or update the lead with all data
    console.log('👤 Creating/updating lead with all data...');
    const leadResult = await createOrUpdateLead(
      context.supabaseClient,
      updatedPost, // Utiliser les données mises à jour
      scrapingResult,
      clientMatch,
      companyInfoResult,
      approachMessage
    );

    console.log('📊 Final lead creation result:', {
      success: leadResult.success,
      action: leadResult.action,
      leadId: leadResult.leadId,
      error: leadResult.error
    });

    return leadResult;
  } catch (error: any) {
    console.error('❌ Error in unified lead creation/update step:', error);
    return {
      success: false,
      action: 'error',
      error: error.message || 'Unknown error during lead creation/update process'
    };
  }
}

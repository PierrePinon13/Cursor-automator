
import { ProcessingContext } from './types.ts';
import { executeOpenAIStep1 } from './openai-step1.ts';
import { executeOpenAIStep2 } from './openai-step2.ts';
import { executeOpenAIStep3 } from './openai-step3.ts';
import { executeUnipileScraping } from './unipile-scraper.ts';
import { executeClientMatching } from './client-matching.ts';
import { executeHrProviderMatching } from './hr-provider-matching.ts';
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
  executeHrProviderMatching,
  executeMessageGeneration,
  executeCompanyInfoStep
};

export async function executeLeadCreation(
  context: ProcessingContext,
  step3Result: any,
  scrapingResult: any,
  clientMatch: any,
  hrProviderMatch: any,
  approachMessage?: string
) {
  try {
    console.log('🏗️ Starting unified lead creation/update step...');
    console.log('📊 Step3 result received:', {
      categorie: step3Result.categorie,
      postes_selectionnes: step3Result.postes_selectionnes,
      justification: step3Result.justification
    });
    
    // Check if this is an HR provider lead - if so, don't create a lead
    if (hrProviderMatch?.isHrProviderLead) {
      console.log('🚫 Skipping lead creation - HR provider match detected');
      return {
        success: true,
        action: 'filtered_hr_provider',
        message: 'Lead filtered due to HR provider match'
      };
    }
    
    // ✅ CORRECTION CRITIQUE : Assurer que les données step3 sont correctement formatées
    const formattedStep3Data = {
      openai_step3_categorie: step3Result.categorie || null,
      openai_step3_postes_selectionnes: Array.isArray(step3Result.postes_selectionnes) 
        ? step3Result.postes_selectionnes 
        : (step3Result.postes_selectionnes ? [step3Result.postes_selectionnes] : null),
      openai_step3_justification: step3Result.justification || null,
      approach_message: approachMessage || null,
      approach_message_generated: !!approachMessage,
      approach_message_generated_at: approachMessage ? new Date().toISOString() : null,
      last_updated_at: new Date().toISOString()
    };

    console.log('📝 Updating post with formatted step3 data:', formattedStep3Data);
    
    const { error: step3UpdateError } = await context.supabaseClient
      .from('linkedin_posts')
      .update(formattedStep3Data)
      .eq('id', context.postId);

    if (step3UpdateError) {
      console.error('❌ Error updating post with step3 data:', step3UpdateError);
      throw new Error(`Failed to update post with step3 data: ${step3UpdateError.message}`);
    } else {
      console.log('✅ Post updated with step3 data successfully');
    }

    // ✅ CORRECTION : Récupérer le post mis à jour avec un select complet et plus de champs critiques
    console.log('📥 Fetching updated post data with complete fields...');
    const { data: updatedPost, error: fetchError } = await context.supabaseClient
      .from('linkedin_posts')
      .select(`
        *,
        openai_step3_categorie,
        openai_step3_postes_selectionnes,
        openai_step3_justification,
        text,
        title,
        url,
        author_name,
        author_profile_id,
        author_profile_url,
        author_headline,
        unipile_company,
        unipile_position,
        unipile_company_linkedin_id,
        posted_at_iso,
        posted_at_timestamp,
        urn,
        apify_dataset_id
      `)
      .eq('id', context.postId)
      .single();

    if (fetchError || !updatedPost) {
      console.error('❌ Error fetching updated post:', fetchError);
      throw new Error(`Failed to fetch updated post data: ${fetchError?.message}`);
    }

    console.log('📊 Updated post data verification:', {
      id: updatedPost.id,
      categorie: updatedPost.openai_step3_categorie,
      postes: updatedPost.openai_step3_postes_selectionnes,
      company: updatedPost.unipile_company,
      position: updatedPost.unipile_position,
      text_length: updatedPost.text?.length || 0,
      has_url: !!updatedPost.url,
      has_author_profile_id: !!updatedPost.author_profile_id,
      has_valid_text: !!updatedPost.text && updatedPost.text !== 'Content unavailable'
    });

    // ✅ CORRECTION CRITIQUE : Assurer que les données essentielles sont présentes
    if (!updatedPost.author_profile_id) {
      console.error('❌ Critical: Missing author_profile_id after update');
      throw new Error('Author profile ID is required for lead creation');
    }

    if (!updatedPost.text || updatedPost.text === 'Content unavailable') {
      console.log('⚠️ Warning: Post has no valid text content');
    }

    if (!updatedPost.url) {
      console.log('⚠️ Warning: Post has no URL');
    }

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
      updatedPost, // Utiliser les données mises à jour avec tous les champs
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

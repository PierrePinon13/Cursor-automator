
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ProcessingContext } from './types.ts';

export interface LeadDeduplicationResult {
  isExisting: boolean;
  leadId?: string;
  action: 'created' | 'updated' | 'error';
  error?: string;
}

export async function handleLeadDeduplication(
  supabaseClient: ReturnType<typeof createClient>,
  post: any
): Promise<LeadDeduplicationResult> {
  try {
    console.log('🔍 Starting improved lead deduplication for profile:', post.author_profile_id);
    
    if (!post.author_profile_id) {
      console.log('❌ No author_profile_id found, skipping deduplication');
      return {
        isExisting: false,
        action: 'error',
        error: 'No LinkedIn profile ID available for deduplication'
      };
    }

    // NOUVELLE STRATÉGIE : Chercher d'abord dans la table leads
    console.log('🔍 Searching for existing lead with profile ID:', post.author_profile_id);
    
    const { data: existingLead, error: fetchLeadError } = await supabaseClient
      .from('leads')
      .select('id, created_at, updated_at, author_name, latest_post_date')
      .eq('author_profile_id', post.author_profile_id)
      .single();

    if (fetchLeadError && fetchLeadError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error checking for existing lead:', fetchLeadError);
      return {
        isExisting: false,
        action: 'error',
        error: `Failed to check for existing lead: ${fetchLeadError.message}`
      };
    }

    if (existingLead) {
      console.log('✅ Existing lead found:', existingLead.id);
      console.log('📊 Lead details:', {
        id: existingLead.id,
        created: existingLead.created_at,
        updated: existingLead.updated_at,
        name: existingLead.author_name,
        latest_post: existingLead.latest_post_date
      });

      // Mettre à jour le lead existant avec les dernières informations
      const updateData = {
        // Données du post le plus récent
        text: post.text,
        title: post.title,
        url: post.url,
        posted_at_timestamp: post.posted_at_timestamp,
        posted_at_iso: post.posted_at_iso,
        author_name: post.author_name,
        author_headline: post.author_headline,
        
        // Mettre à jour les données OpenAI si disponibles
        ...(post.openai_step2_localisation && { openai_step2_localisation: post.openai_step2_localisation }),
        ...(post.openai_step3_categorie && { openai_step3_categorie: post.openai_step3_categorie }),
        ...(post.openai_step3_postes_selectionnes && { openai_step3_postes_selectionnes: post.openai_step3_postes_selectionnes }),
        ...(post.openai_step3_justification && { openai_step3_justification: post.openai_step3_justification }),
        
        // Mettre à jour les données Unipile si disponibles
        ...(post.unipile_company && { company_name: post.unipile_company, unipile_company: post.unipile_company }),
        ...(post.unipile_position && { company_position: post.unipile_position, unipile_position: post.unipile_position }),
        ...(post.unipile_company_linkedin_id && { 
          company_linkedin_id: post.unipile_company_linkedin_id, 
          unipile_company_linkedin_id: post.unipile_company_linkedin_id 
        }),
        
        // Mettre à jour le message d'approche si disponible
        ...(post.approach_message && { approach_message: post.approach_message }),
        ...(post.approach_message_generated !== undefined && { approach_message_generated: post.approach_message_generated }),
        
        // Informations de matching client
        ...(post.is_client_lead !== undefined && { is_client_lead: post.is_client_lead }),
        ...(post.matched_client_id && { matched_client_id: post.matched_client_id }),
        ...(post.matched_client_name && { matched_client_name: post.matched_client_name }),
        
        // Informations du post le plus récent
        latest_post_date: post.posted_at_iso,
        latest_post_url: post.url,
        latest_post_urn: post.urn,
        
        // Métadonnées
        last_updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabaseClient
        .from('leads')
        .update(updateData)
        .eq('id', existingLead.id);

      if (updateError) {
        console.error('❌ Error updating existing lead:', updateError);
        return {
          isExisting: true,
          leadId: existingLead.id,
          action: 'error',
          error: `Failed to update existing lead: ${updateError.message}`
        };
      }

      // Lier le post actuel au lead existant
      await supabaseClient
        .from('linkedin_posts')
        .update({ 
          lead_id: existingLead.id,
          processing_status: 'completed',
          last_updated_at: new Date().toISOString()
        })
        .eq('id', post.id);

      console.log('✅ Successfully updated existing lead:', existingLead.id);
      return {
        isExisting: true,
        leadId: existingLead.id,
        action: 'updated'
      };
    } else {
      console.log('✨ No existing lead found, will create new one');
      return {
        isExisting: false,
        action: 'created'
      };
    }

  } catch (error: any) {
    console.error('❌ Error in improved lead deduplication:', error);
    return {
      isExisting: false,
      action: 'error',
      error: error.message || 'Unknown error during deduplication'
    };
  }
}

export async function executeLeadDeduplication(
  context: ProcessingContext,
  post: any
): Promise<LeadDeduplicationResult> {
  try {
    console.log('🔍 Step 6: Lead deduplication...');
    
    const deduplicationResult = await handleLeadDeduplication(
      context.supabaseClient,
      post
    );

    if (deduplicationResult.action === 'updated') {
      console.log('✅ Lead deduplication completed - existing lead updated:', deduplicationResult.leadId);
    } else if (deduplicationResult.action === 'created') {
      console.log('✅ Lead deduplication completed - new lead will be created');
    } else {
      console.log('⚠️ Lead deduplication completed with error:', deduplicationResult.error);
    }

    return deduplicationResult;

  } catch (error: any) {
    console.error('❌ Error in lead deduplication step:', error);
    return {
      isExisting: false,
      action: 'error',
      error: error.message || 'Unknown error during lead deduplication'
    };
  }
}

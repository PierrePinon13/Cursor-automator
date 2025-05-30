
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { UnipileScrapingResult } from './unipile-scraper.ts';
import { ClientMatchResult } from './client-matching.ts';

export interface LeadCreationResult {
  success: boolean;
  leadId?: string;
  action: 'created' | 'updated' | 'error';
  error?: string;
}

export async function createOrUpdateLead(
  supabaseClient: ReturnType<typeof createClient>,
  post: any,
  scrapingResult: UnipileScrapingResult,
  clientMatch: ClientMatchResult,
  approachMessage?: string
): Promise<LeadCreationResult> {
  try {
    console.log('🏗️ Creating or updating lead for profile:', post.author_profile_id);
    
    if (!post.author_profile_id) {
      console.log('No author_profile_id found, cannot create lead');
      return {
        success: false,
        action: 'error',
        error: 'No LinkedIn profile ID available for lead creation'
      };
    }

    // Vérifier si un lead existe déjà pour cette personne
    const { data: existingLead, error: fetchError } = await supabaseClient
      .from('leads')
      .select('id')
      .eq('author_profile_id', post.author_profile_id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking for existing lead:', fetchError);
      return {
        success: false,
        action: 'error',
        error: `Failed to check for existing lead: ${fetchError.message}`
      };
    }

    const leadData = {
      author_profile_id: post.author_profile_id,
      author_name: post.author_name,
      author_headline: post.author_headline,
      author_profile_url: post.author_profile_url,
      company_name: scrapingResult.company,
      company_position: scrapingResult.position,
      company_linkedin_id: scrapingResult.company_id,
      approach_message: approachMessage,
      approach_message_generated: !!approachMessage,
      approach_message_generated_at: approachMessage ? new Date().toISOString() : null,
      is_client_lead: clientMatch.isClientLead,
      matched_client_id: clientMatch.clientId,
      matched_client_name: clientMatch.clientName,
      last_updated_at: new Date().toISOString()
    };

    let leadId: string;
    let action: 'created' | 'updated';

    if (existingLead) {
      // Mettre à jour le lead existant
      console.log('📝 Updating existing lead:', existingLead.id);
      
      const { error: updateError } = await supabaseClient
        .from('leads')
        .update(leadData)
        .eq('id', existingLead.id);

      if (updateError) {
        console.error('Error updating existing lead:', updateError);
        return {
          success: false,
          action: 'error',
          error: `Failed to update existing lead: ${updateError.message}`
        };
      }

      leadId = existingLead.id;
      action = 'updated';
    } else {
      // Créer un nouveau lead
      console.log('✨ Creating new lead');
      
      const { data: newLead, error: insertError } = await supabaseClient
        .from('leads')
        .insert(leadData)
        .select('id')
        .single();

      if (insertError || !newLead) {
        console.error('Error creating new lead:', insertError);
        return {
          success: false,
          action: 'error',
          error: `Failed to create new lead: ${insertError?.message}`
        };
      }

      leadId = newLead.id;
      action = 'created';
    }

    // Lier le post actuel au lead
    const { error: linkError } = await supabaseClient
      .from('linkedin_posts')
      .update({ lead_id: leadId })
      .eq('id', post.id);

    if (linkError) {
      console.error('Error linking post to lead:', linkError);
      // Ne pas considérer cela comme une erreur fatale
    }

    console.log(`✅ Lead ${action} successfully:`, leadId);
    return {
      success: true,
      leadId,
      action
    };

  } catch (error: any) {
    console.error('❌ Error in lead creation:', error);
    return {
      success: false,
      action: 'error',
      error: error.message || 'Unknown error during lead creation'
    };
  }
}


import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    console.log('Starting lead deduplication for profile:', post.author_profile_id);
    
    if (!post.author_profile_id) {
      console.log('No author_profile_id found, skipping deduplication');
      return {
        isExisting: false,
        action: 'error',
        error: 'No LinkedIn profile ID available for deduplication'
      };
    }

    // Check if a lead already exists with this LinkedIn profile ID
    const { data: existingLead, error: fetchError } = await supabaseClient
      .from('linkedin_posts')
      .select('id, created_at, updated_at')
      .eq('author_profile_id', post.author_profile_id)
      .eq('processing_status', 'completed')
      .neq('id', post.id) // Exclude current post
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Error checking for existing lead:', fetchError);
      return {
        isExisting: false,
        action: 'error',
        error: `Failed to check for existing lead: ${fetchError.message}`
      };
    }

    if (existingLead) {
      console.log('Existing lead found:', existingLead.id, 'updating with new information');
      
      // Update the existing lead with the latest information
      const { error: updateError } = await supabaseClient
        .from('linkedin_posts')
        .update({
          // Update with latest post information
          text: post.text,
          title: post.title,
          url: post.url,
          posted_at_timestamp: post.posted_at_timestamp,
          posted_at_iso: post.posted_at_iso,
          author_name: post.author_name,
          author_headline: post.author_headline,
          // Update processing results
          openai_step2_localisation: post.openai_step2_localisation,
          openai_step3_categorie: post.openai_step3_categorie,
          openai_step3_postes_selectionnes: post.openai_step3_postes_selectionnes,
          openai_step3_justification: post.openai_step3_justification,
          unipile_company: post.unipile_company,
          unipile_position: post.unipile_position,
          unipile_company_linkedin_id: post.unipile_company_linkedin_id,
          approach_message: post.approach_message,
          approach_message_generated: post.approach_message_generated,
          phone_number: post.phone_number,
          is_client_lead: post.is_client_lead,
          matched_client_name: post.matched_client_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLead.id);

      if (updateError) {
        console.error('Error updating existing lead:', updateError);
        return {
          isExisting: true,
          leadId: existingLead.id,
          action: 'error',
          error: `Failed to update existing lead: ${updateError.message}`
        };
      }

      // Mark the current duplicate post as processed but duplicate
      await supabaseClient
        .from('linkedin_posts')
        .update({
          processing_status: 'duplicate',
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id);

      console.log('Successfully updated existing lead:', existingLead.id);
      return {
        isExisting: true,
        leadId: existingLead.id,
        action: 'updated'
      };
    } else {
      console.log('No existing lead found, this is a new lead');
      return {
        isExisting: false,
        action: 'created'
      };
    }

  } catch (error: any) {
    console.error('Error in lead deduplication:', error);
    return {
      isExisting: false,
      action: 'error',
      error: error.message || 'Unknown error during deduplication'
    };
  }
}


import { ProcessingContext } from './types.ts';
import { buildLeadData } from './lead-data-builder.ts';

export async function createOrUpdateLead(
  supabaseClient: any,
  post: any,
  scrapingResult: any,
  clientMatch: any,
  companyInfoResult: any,
  approachMessage?: string
) {
  try {
    console.log('🏗️ Creating/updating lead with complete data...');
    console.log('📊 Post data for lead creation:', {
      id: post.id,
      author_profile_id: post.author_profile_id,
      apify_dataset_id: post.apify_dataset_id,
      text_length: post.text?.length || 0,
      has_url: !!post.url,
      has_approach_message: !!approachMessage,
      author_name: post.author_name
    });

    // Vérifier si un lead existe déjà pour ce author_profile_id
    const { data: existingLead, error: checkError } = await supabaseClient
      .from('leads')
      .select('id, latest_post_date, posted_at_timestamp')
      .eq('author_profile_id', post.author_profile_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ Error checking existing lead:', checkError);
      throw new Error(`Failed to check existing lead: ${checkError.message}`);
    }

    // Déterminer la date du post pour comparaison
    let postTimestamp = null;
    let postDate = null;
    
    if (post.posted_at_timestamp) {
      postTimestamp = post.posted_at_timestamp;
      postDate = new Date(post.posted_at_timestamp);
    } else if (post.posted_at_iso) {
      postDate = new Date(post.posted_at_iso);
      postTimestamp = postDate.getTime();
    }

    // Préparer les données complètes du lead
    const leadData = buildLeadData({
      post,
      scrapingResult,
      clientMatch,
      companyInfoResult,
      approachMessage
    });

    console.log('📝 Prepared lead data:', {
      apify_dataset_id: leadData.apify_dataset_id,
      text_length: leadData.text?.length || 0,
      has_url: !!leadData.url,
      author_profile_id: leadData.author_profile_id,
      author_name: leadData.author_name,
      company_name: leadData.company_name,
      unipile_company: leadData.unipile_company,
      approach_message_length: leadData.approach_message?.length || 0
    });

    if (existingLead) {
      console.log('🔄 Updating existing lead:', existingLead.id);
      
      // Vérifier si ce post est plus récent
      const existingTimestamp = existingLead.posted_at_timestamp || 0;
      const newTimestamp = postTimestamp || 0;
      
      if (newTimestamp > existingTimestamp) {
        console.log('📅 New post is more recent, updating lead data');
        
        const { error: updateError } = await supabaseClient
          .from('leads')
          .update(leadData)
          .eq('id', existingLead.id);

        if (updateError) {
          console.error('❌ Error updating existing lead:', updateError);
          throw new Error(`Failed to update existing lead: ${updateError.message}`);
        }

        // Mettre à jour le linkedin_posts avec le lead_id
        await supabaseClient
          .from('linkedin_posts')
          .update({ 
            lead_id: existingLead.id,
            last_updated_at: new Date().toISOString()
          })
          .eq('id', post.id);

        console.log('✅ Existing lead updated successfully');
        return {
          success: true,
          action: 'updated',
          leadId: existingLead.id,
          message: 'Lead updated with newer post data'
        };
      } else {
        console.log('📅 Existing post is more recent, keeping existing data');
        
        // Juste lier le post au lead existant
        await supabaseClient
          .from('linkedin_posts')
          .update({ 
            lead_id: existingLead.id,
            last_updated_at: new Date().toISOString()
          })
          .eq('id', post.id);

        return {
          success: true,
          action: 'linked',
          leadId: existingLead.id,
          message: 'Post linked to existing lead'
        };
      }
    } else {
      console.log('➕ Creating new lead...');
      
      const { data: newLead, error: insertError } = await supabaseClient
        .from('leads')
        .insert(leadData)
        .select('id')
        .single();

      if (insertError) {
        console.error('❌ Error creating new lead:', insertError);
        throw new Error(`Failed to create new lead: ${insertError.message}`);
      }

      // Mettre à jour le linkedin_posts avec le lead_id
      await supabaseClient
        .from('linkedin_posts')
        .update({ 
          lead_id: newLead.id,
          last_updated_at: new Date().toISOString()
        })
        .eq('id', post.id);

      console.log('✅ New lead created successfully:', newLead.id);
      return {
        success: true,
        action: 'created',
        leadId: newLead.id,
        message: 'New lead created successfully'
      };
    }
  } catch (error: any) {
    console.error('❌ Error in createOrUpdateLead:', error);
    return {
      success: false,
      action: 'error',
      error: error.message || 'Unknown error during lead creation/update'
    };
  }
}

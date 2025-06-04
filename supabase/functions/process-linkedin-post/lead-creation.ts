
import { ProcessingContext } from './types.ts';

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
      has_approach_message: !!approachMessage
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

    // ✅ CORRECTION MAJEURE : Préparer les données complètes du lead avec TOUTES les informations
    const leadData = {
      // Données de base du post LinkedIn - CORRECTION : Inclure apify_dataset_id
      apify_dataset_id: post.apify_dataset_id,
      text: post.text || 'Content unavailable',
      title: post.title || null,
      url: post.url || null,
      posted_at_iso: post.posted_at_iso || null,
      posted_at_timestamp: postTimestamp,
      latest_post_date: postDate?.toISOString() || null,
      latest_post_urn: post.urn || null,
      latest_post_url: post.url || null,
      
      // Données de l'auteur
      author_profile_id: post.author_profile_id,
      author_name: post.author_name || 'Unknown author',
      author_headline: post.author_headline || null,
      author_profile_url: post.author_profile_url || null,
      
      // Données OpenAI Steps
      openai_step3_categorie: post.openai_step3_categorie || null,
      openai_step3_postes_selectionnes: post.openai_step3_postes_selectionnes || null,
      openai_step3_justification: post.openai_step3_justification || null,
      
      // Données Unipile (du scraping)
      unipile_company: scrapingResult?.company || null,
      unipile_position: scrapingResult?.position || null,
      unipile_company_linkedin_id: scrapingResult?.company_linkedin_id || null,
      
      // Message d'approche
      approach_message: approachMessage || null,
      approach_message_generated: !!approachMessage,
      approach_message_generated_at: approachMessage ? new Date().toISOString() : null,
      
      // Informations client
      is_client_lead: clientMatch?.isClientLead || false,
      matched_client_id: clientMatch?.clientId || null,
      matched_client_name: clientMatch?.clientName || null,
      has_previous_client_company: clientMatch?.hasPreviousClientCompany || false,
      previous_client_companies: clientMatch?.previousClientCompanies || null,
      
      // Informations de l'entreprise (depuis company info step)
      company_id: companyInfoResult?.companyId || null,
      company_name: companyInfoResult?.companyName || scrapingResult?.company || null,
      company_linkedin_id: companyInfoResult?.linkedinId || scrapingResult?.company_linkedin_id || null,
      
      // Historique professionnel (jusqu'à 5 entreprises)
      company_1_name: scrapingResult?.work_history?.[0]?.company || null,
      company_1_position: scrapingResult?.work_history?.[0]?.position || null,
      company_1_start_date: scrapingResult?.work_history?.[0]?.start_date || null,
      company_1_end_date: scrapingResult?.work_history?.[0]?.end_date || null,
      company_1_is_current: scrapingResult?.work_history?.[0]?.is_current || false,
      company_1_duration_months: scrapingResult?.work_history?.[0]?.duration_months || null,
      company_1_linkedin_id: scrapingResult?.work_history?.[0]?.company_linkedin_id || null,
      company_1_linkedin_url: scrapingResult?.work_history?.[0]?.company_linkedin_url || null,
      
      company_2_name: scrapingResult?.work_history?.[1]?.company || null,
      company_2_position: scrapingResult?.work_history?.[1]?.position || null,
      company_2_start_date: scrapingResult?.work_history?.[1]?.start_date || null,
      company_2_end_date: scrapingResult?.work_history?.[1]?.end_date || null,
      company_2_is_current: scrapingResult?.work_history?.[1]?.is_current || false,
      company_2_duration_months: scrapingResult?.work_history?.[1]?.duration_months || null,
      company_2_linkedin_id: scrapingResult?.work_history?.[1]?.company_linkedin_id || null,
      company_2_linkedin_url: scrapingResult?.work_history?.[1]?.company_linkedin_url || null,
      
      company_3_name: scrapingResult?.work_history?.[2]?.company || null,
      company_3_position: scrapingResult?.work_history?.[2]?.position || null,
      company_3_start_date: scrapingResult?.work_history?.[2]?.start_date || null,
      company_3_end_date: scrapingResult?.work_history?.[2]?.end_date || null,
      company_3_is_current: scrapingResult?.work_history?.[2]?.is_current || false,
      company_3_duration_months: scrapingResult?.work_history?.[2]?.duration_months || null,
      company_3_linkedin_id: scrapingResult?.work_history?.[2]?.company_linkedin_id || null,
      company_3_linkedin_url: scrapingResult?.work_history?.[2]?.company_linkedin_url || null,
      
      company_4_name: scrapingResult?.work_history?.[3]?.company || null,
      company_4_position: scrapingResult?.work_history?.[3]?.position || null,
      company_4_start_date: scrapingResult?.work_history?.[3]?.start_date || null,
      company_4_end_date: scrapingResult?.work_history?.[3]?.end_date || null,
      company_4_is_current: scrapingResult?.work_history?.[3]?.is_current || false,
      company_4_duration_months: scrapingResult?.work_history?.[3]?.duration_months || null,
      company_4_linkedin_id: scrapingResult?.work_history?.[3]?.company_linkedin_id || null,
      company_4_linkedin_url: scrapingResult?.work_history?.[3]?.company_linkedin_url || null,
      
      company_5_name: scrapingResult?.work_history?.[4]?.company || null,
      company_5_position: scrapingResult?.work_history?.[4]?.position || null,
      company_5_start_date: scrapingResult?.work_history?.[4]?.start_date || null,
      company_5_end_date: scrapingResult?.work_history?.[4]?.end_date || null,
      company_5_is_current: scrapingResult?.work_history?.[4]?.is_current || false,
      company_5_duration_months: scrapingResult?.work_history?.[4]?.duration_months || null,
      company_5_linkedin_id: scrapingResult?.work_history?.[4]?.company_linkedin_id || null,
      company_5_linkedin_url: scrapingResult?.work_history?.[4]?.company_linkedin_url || null,
      
      // Métadonnées
      processing_status: 'completed',
      last_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 Prepared lead data:', {
      apify_dataset_id: leadData.apify_dataset_id,
      text_length: leadData.text?.length || 0,
      has_url: !!leadData.url,
      author_profile_id: leadData.author_profile_id,
      company_name: leadData.company_name,
      unipile_company: leadData.unipile_company
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

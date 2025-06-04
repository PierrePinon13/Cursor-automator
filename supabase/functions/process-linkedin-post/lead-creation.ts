
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { UnipileScrapingResult } from './unipile-scraper.ts';
import { ClientMatchResult } from './client-matching.ts';
import { CompanyInfoResult } from './company-info-step.ts';

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
  companyInfo: CompanyInfoResult,
  approachMessage?: string
): Promise<LeadCreationResult> {
  try {
    console.log('🏗️ Creating or updating lead for profile:', post.author_profile_id);
    console.log('📊 Debug - Post data verification:', {
      id: post.id,
      categorie: post.openai_step3_categorie,
      postes: post.openai_step3_postes_selectionnes,
      justification: post.openai_step3_justification,
      text_preview: post.text?.substring(0, 100) || 'NO TEXT',
      url: post.url || 'NO URL',
      author_name: post.author_name || 'NO NAME'
    });
    
    if (!post.author_profile_id) {
      console.log('❌ No author_profile_id found, cannot create lead');
      return {
        success: false,
        action: 'error',
        error: 'No LinkedIn profile ID available for lead creation'
      };
    }

    // ✅ VÉRIFICATION CRITIQUE : S'assurer que les données essentielles sont présentes
    if (!post.openai_step3_postes_selectionnes || post.openai_step3_postes_selectionnes.length === 0) {
      console.log('⚠️ Warning: No specific job positions found in step3 data');
    }

    if (!post.text || post.text === 'Content unavailable') {
      console.log('⚠️ Warning: No valid post text found - this will affect display');
    }

    // ✅ AMÉLIORATION : Vérifier d'abord si le lead existe pour implémenter un upsert
    console.log('🔍 Checking if lead already exists for profile:', post.author_profile_id);
    
    const { data: existingLead, error: fetchError } = await supabaseClient
      .from('leads')
      .select('id, created_at, updated_at, author_name, latest_post_date')
      .eq('author_profile_id', post.author_profile_id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error checking for existing lead:', fetchError);
      return {
        success: false,
        action: 'error',
        error: `Failed to check for existing lead: ${fetchError.message}`
      };
    }

    // Extract work history from Unipile data
    const companyData = await extractWorkHistoryForLead(scrapingResult, supabaseClient);

    // ✅ CORRECTION MAJEURE : Préparer les données du lead avec validation complète
    const leadData = {
      // Identifiants
      author_profile_id: post.author_profile_id,
      author_profile_url: post.author_profile_url,
      
      // Dataset ID
      apify_dataset_id: post.apify_dataset_id,
      
      // Informations personnelles
      author_name: post.author_name || 'Unknown author',
      author_headline: post.author_headline,
      
      // ✅ CORRECTION CRITIQUE : S'assurer que le contenu de la publication est copié correctement
      text: post.text && post.text !== 'Content unavailable' ? post.text : null,
      title: post.title || null,
      url: post.url || '',
      posted_at_iso: post.posted_at_iso,
      posted_at_timestamp: post.posted_at_timestamp,
      
      // ✅ CORRECTION MAJEURE : Données OpenAI step3 avec validation et fallbacks
      openai_step2_localisation: post.openai_step2_localisation || null,
      openai_step3_categorie: post.openai_step3_categorie || null,
      openai_step3_postes_selectionnes: Array.isArray(post.openai_step3_postes_selectionnes) && post.openai_step3_postes_selectionnes.length > 0 
        ? post.openai_step3_postes_selectionnes 
        : null,
      openai_step3_justification: post.openai_step3_justification || null,
      
      // Informations entreprise (Unipile)
      company_name: scrapingResult.company || post.unipile_company || null,
      company_position: scrapingResult.position || post.unipile_position || null,
      company_linkedin_id: scrapingResult.company_id || post.unipile_company_linkedin_id || null,
      unipile_company: scrapingResult.company || post.unipile_company || null,
      unipile_position: scrapingResult.position || post.unipile_position || null,
      unipile_company_linkedin_id: scrapingResult.company_id || post.unipile_company_linkedin_id || null,
      
      // Référence à l'entreprise dans la table companies
      company_id: companyInfo.success && companyInfo.companyId ? companyInfo.companyId : null,
      
      // Message d'approche
      approach_message: approachMessage || null,
      approach_message_generated: !!approachMessage,
      approach_message_generated_at: approachMessage ? new Date().toISOString() : null,
      
      // Correspondance client
      is_client_lead: clientMatch.isClientLead,
      matched_client_id: clientMatch.clientId || null,
      matched_client_name: clientMatch.clientName || null,
      
      // Informations du post le plus récent
      latest_post_date: post.posted_at_iso,
      latest_post_url: post.url,
      latest_post_urn: post.urn,
      
      // Historique professionnel (5 entreprises max)
      ...companyData.workHistory,
      
      // Détection des entreprises clientes précédentes
      has_previous_client_company: companyData.hasPreviousClient,
      previous_client_companies: companyData.previousClientCompanies,
      
      // Métadonnées
      processing_status: 'completed',
      last_updated_at: new Date().toISOString()
    };

    console.log('📋 Lead data prepared:', {
      profile_id: leadData.author_profile_id,
      dataset_id: leadData.apify_dataset_id,
      name: leadData.author_name,
      company: leadData.company_name,
      company_id: leadData.company_id,
      position: leadData.company_position,
      category: leadData.openai_step3_categorie,
      jobs: leadData.openai_step3_postes_selectionnes,
      is_client: leadData.is_client_lead,
      client_name: leadData.matched_client_name,
      has_previous_client: leadData.has_previous_client_company,
      previous_clients: leadData.previous_client_companies,
      text_length: leadData.text?.length || 0,
      has_url: !!leadData.url,
      has_valid_text: !!leadData.text && leadData.text !== 'Content unavailable'
    });

    let leadId: string;
    let action: 'created' | 'updated';

    if (existingLead) {
      // ✅ MISE À JOUR : Lead existant trouvé, on le met à jour
      console.log('📝 Updating existing lead:', existingLead.id);
      
      const { error: updateError } = await supabaseClient
        .from('leads')
        .update(leadData)
        .eq('id', existingLead.id);

      if (updateError) {
        console.error('❌ Error updating existing lead:', updateError);
        return {
          success: false,
          action: 'error',
          error: `Failed to update existing lead: ${updateError.message}`
        };
      }

      leadId = existingLead.id;
      action = 'updated';
      console.log('✅ Existing lead updated successfully:', leadId);
    } else {
      // ✅ CRÉATION : Nouveau lead
      console.log('✨ Creating new lead');
      
      const { data: newLead, error: insertError } = await supabaseClient
        .from('leads')
        .insert(leadData)
        .select('id')
        .single();

      if (insertError || !newLead) {
        console.error('❌ Error creating new lead:', insertError);
        return {
          success: false,
          action: 'error',
          error: `Failed to create new lead: ${insertError?.message}`
        };
      }

      leadId = newLead.id;
      action = 'created';
      console.log('✅ New lead created successfully:', leadId);
    }

    // Lier le post actuel au lead (nouveau ou existant)
    const { error: linkError } = await supabaseClient
      .from('linkedin_posts')
      .update({ 
        lead_id: leadId,
        processing_status: 'completed',
        last_updated_at: new Date().toISOString()
      })
      .eq('id', post.id);

    if (linkError) {
      console.error('⚠️ Error linking post to lead:', linkError);
      // Ne pas considérer cela comme une erreur fatale
    }

    return {
      success: true,
      leadId: leadId,
      action: action
    };

  } catch (error: any) {
    console.error('❌ Error in lead creation/update:', error);
    return {
      success: false,
      action: 'error',
      error: error.message || 'Unknown error during lead creation/update'
    };
  }
}

async function extractWorkHistoryForLead(
  scrapingResult: UnipileScrapingResult,
  supabaseClient: ReturnType<typeof createClient>
) {
  console.log('💼 Extracting work history for lead...');
  
  const workHistory: any = {};
  let hasPreviousClient = false;
  const previousClientCompanies: string[] = [];
  
  // Get client companies for comparison
  const { data: clientCompanies, error: clientError } = await supabaseClient
    .from('clients')
    .select('company_name, company_linkedin_id, company_linkedin_url');
  
  if (clientError) {
    console.error('⚠️ Error fetching client companies:', clientError);
  }
  
  // Extract work experience from Unipile profile data
  const experiences = scrapingResult.profile?.work_experience || 
                    scrapingResult.profile?.linkedin_profile?.experience || 
                    [];
  
  console.log('💼 Found', experiences.length, 'work experiences for lead');
  
  for (let i = 0; i < Math.min(experiences.length, 5); i++) {
    const exp = experiences[i];
    const companyIndex = i + 1;
    
    const companyName = exp.company || exp.companyName || '';
    const companyLinkedInId = exp.company_id || exp.companyId || '';
    let companyLinkedInUrl = exp.company_url || '';
    
    // Generate LinkedIn URL if we have ID but no URL
    if (companyLinkedInId && !companyLinkedInUrl) {
      companyLinkedInUrl = `https://www.linkedin.com/company/${companyLinkedInId}`;
    }
    
    workHistory[`company_${companyIndex}_name`] = companyName;
    workHistory[`company_${companyIndex}_position`] = exp.position || exp.title || '';
    workHistory[`company_${companyIndex}_start_date`] = exp.start || exp.startDate || null;
    workHistory[`company_${companyIndex}_end_date`] = exp.end || exp.endDate || null;
    workHistory[`company_${companyIndex}_is_current`] = !exp.end || exp.end === null || exp.end === '';
    workHistory[`company_${companyIndex}_duration_months`] = calculateDurationInMonths(
      exp.start || exp.startDate, 
      exp.end || exp.endDate
    );
    workHistory[`company_${companyIndex}_linkedin_id`] = companyLinkedInId;
    workHistory[`company_${companyIndex}_linkedin_url`] = companyLinkedInUrl;
    
    // Check if this company is a client
    if (clientCompanies && companyName) {
      const matchingClient = clientCompanies.find(client => 
        client.company_name?.toLowerCase() === companyName.toLowerCase() ||
        client.company_linkedin_id === companyLinkedInId ||
        client.company_linkedin_url === companyLinkedInUrl
      );
      
      if (matchingClient) {
        hasPreviousClient = true;
        previousClientCompanies.push(companyName);
        console.log(`🎯 Found previous client company: ${companyName}`);
      }
    }
  }
  
  console.log('📊 Work history extracted:', {
    companies: Math.min(experiences.length, 5),
    hasPreviousClient,
    previousClientCompanies
  });
  
  return {
    workHistory,
    hasPreviousClient,
    previousClientCompanies
  };
}

function calculateDurationInMonths(startDate: string | null, endDate: string | null): number | null {
  if (!startDate) return null;
  
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  
  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  
  return yearDiff * 12 + monthDiff;
}

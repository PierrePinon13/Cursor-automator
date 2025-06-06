
export interface LeadDataInput {
  post: any;
  scrapingResult: any;
  clientMatch: any;
  companyInfoResult: any;
  approachMessage?: string;
}

export function buildLeadData(input: LeadDataInput) {
  const { post, scrapingResult, clientMatch, companyInfoResult, approachMessage } = input;
  
  console.log('🏗️ Building lead data with complete information...');
  
  // Extraire prénom et nom depuis les raw_data si disponibles
  let firstName = null;
  let lastName = null;
  
  if (post.raw_data?.author_first_name && post.raw_data?.author_last_name) {
    firstName = post.raw_data.author_first_name.trim();
    lastName = post.raw_data.author_last_name.trim();
    console.log('📝 Extracted first/last name from raw_data:', { firstName, lastName });
  } else if (post.author_name) {
    // Fallback: essayer d'extraire depuis author_name
    const nameParts = post.author_name.trim().split(' ');
    if (nameParts.length >= 2) {
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' ');
      console.log('📝 Extracted first/last name from author_name:', { firstName, lastName });
    }
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

  // Construire les données du lead
  return {
    // Données de base du post LinkedIn
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
    
    // Informations de l'entreprise
    company_id: companyInfoResult?.companyId || null,
    company_name: companyInfoResult?.companyName || scrapingResult?.company || null,
    company_linkedin_id: companyInfoResult?.linkedinId || scrapingResult?.company_linkedin_id || null,
    
    // Historique professionnel (jusqu'à 5 entreprises)
    ...buildWorkHistoryFields(scrapingResult?.work_history || []),
    
    // Métadonnées
    processing_status: 'completed',
    last_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

function buildWorkHistoryFields(workHistory: any[]) {
  const fields: any = {};
  
  for (let i = 0; i < 5; i++) {
    const experience = workHistory[i];
    const index = i + 1;
    
    if (experience) {
      fields[`company_${index}_name`] = experience.company || null;
      fields[`company_${index}_position`] = experience.position || null;
      fields[`company_${index}_start_date`] = experience.start_date || null;
      fields[`company_${index}_end_date`] = experience.end_date || null;
      fields[`company_${index}_is_current`] = experience.is_current || false;
      fields[`company_${index}_duration_months`] = experience.duration_months || null;
      fields[`company_${index}_linkedin_id`] = experience.company_linkedin_id || null;
      fields[`company_${index}_linkedin_url`] = experience.company_linkedin_url || null;
    } else {
      fields[`company_${index}_name`] = null;
      fields[`company_${index}_position`] = null;
      fields[`company_${index}_start_date`] = null;
      fields[`company_${index}_end_date`] = null;
      fields[`company_${index}_is_current`] = false;
      fields[`company_${index}_duration_months`] = null;
      fields[`company_${index}_linkedin_id`] = null;
      fields[`company_${index}_linkedin_url`] = null;
    }
  }
  
  return fields;
}


import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MessageGenerationResult {
  success: boolean;
  message?: string;
  error?: string;
  attempts?: number;
  usedDefaultTemplate?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('👤 Specialized Lead Worker started');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { post_id, dataset_id, batch_mode = false } = await req.json();
    
    if (batch_mode) {
      return await processBatchLeads(supabaseClient, dataset_id);
    } else {
      return await processSingleLead(supabaseClient, post_id, dataset_id);
    }

  } catch (error) {
    console.error('❌ Error in specialized-lead-worker:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processSingleLead(supabaseClient: any, postId: string, datasetId: string) {
  console.log(`👤 Processing lead creation for post: ${postId}`);

  // Récupérer le post complet avec toutes les données nécessaires
  const { data: post, error: fetchError } = await supabaseClient
    .from('linkedin_posts')
    .select(`
      *,
      openai_step3_categorie,
      openai_step3_postes_selectionnes,
      openai_step3_justification,
      unipile_response,
      unipile_company,
      unipile_position,
      unipile_company_linkedin_id
    `)
    .eq('id', postId)
    .single();

  if (fetchError || !post) {
    throw new Error(`Post not found: ${postId}`);
  }

  console.log('📊 Post data for lead creation:', {
    id: post.id,
    author_name: post.author_name,
    has_openai_step3: !!post.openai_step3_postes_selectionnes,
    has_unipile_data: !!post.unipile_response,
    company: post.unipile_company,
    position: post.unipile_position
  });

  try {
    // Vérifier si ce profil existe déjà comme lead
    const existingLead = await checkExistingLead(supabaseClient, post);
    
    if (existingLead) {
      console.log(`♻️ Lead already exists for profile: ${post.author_profile_id}`);
      
      // Mettre à jour le post avec l'ID du lead existant
      await supabaseClient
        .from('linkedin_posts')
        .update({
          lead_id: existingLead.id,
          processing_status: 'duplicate',
          last_updated_at: new Date().toISOString()
        })
        .eq('id', postId);

      return new Response(JSON.stringify({
        success: true,
        action: 'existing_lead_linked',
        lead_id: existingLead.id,
        post_id: postId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extraction complète des données Unipile
    const unipileExtraction = extractUnipileData(post.unipile_response);
    console.log('📋 Unipile extraction result:', {
      has_work_history: unipileExtraction.workHistory.length,
      current_company: unipileExtraction.currentCompany,
      current_position: unipileExtraction.currentPosition,
      phone: unipileExtraction.phone ? 'Found' : 'Not found'
    });

    // Vérification HR provider (utilise les données Unipile extraites)
    const hrProviderCheck = await checkHrProviderMatch(supabaseClient, unipileExtraction.currentCompanyLinkedInId);
    
    if (hrProviderCheck.isHrProvider) {
      console.log('🚫 Skipping lead creation - HR provider detected:', hrProviderCheck.hrProviderName);
      
      await supabaseClient
        .from('linkedin_posts')
        .update({
          processing_status: 'filtered_hr_provider',
          is_hr_provider_lead: true,
          matched_hr_provider_id: hrProviderCheck.hrProviderId,
          matched_hr_provider_name: hrProviderCheck.hrProviderName,
          last_updated_at: new Date().toISOString()
        })
        .eq('id', postId);

      return new Response(JSON.stringify({
        success: true,
        action: 'filtered_hr_provider',
        hr_provider_name: hrProviderCheck.hrProviderName,
        post_id: postId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Vérification client match
    const clientMatch = await checkClientMatch(supabaseClient, unipileExtraction.currentCompanyLinkedInId);
    
    // Vérification historique professionnel vs clients
    const clientHistoryAnalysis = await analyzeClientWorkHistory(supabaseClient, unipileExtraction.workHistory);

    // Créer un nouveau lead avec toutes les données enrichies
    const leadData = buildLeadData(post, unipileExtraction, clientMatch, clientHistoryAnalysis);

    const { data: newLead, error: leadError } = await supabaseClient
      .from('leads')
      .insert(leadData)
      .select('id')
      .single();

    if (leadError) {
      throw new Error(`Error creating lead: ${leadError.message}`);
    }

    // Mettre à jour le post avec l'ID du nouveau lead
    await supabaseClient
      .from('linkedin_posts')
      .update({
        lead_id: newLead.id,
        is_client_lead: clientMatch.isClient,
        matched_client_id: clientMatch.clientId,
        matched_client_name: clientMatch.clientName,
        processing_status: 'completed',
        last_updated_at: new Date().toISOString()
      })
      .eq('id', postId);

    // Générer le message d'approche si ce n'est pas un client
    let approachMessageResult = null;
    if (!clientMatch.isClient) {
      approachMessageResult = await generateApproachMessage(supabaseClient, newLead.id, post);
    }

    console.log(`✅ Lead created successfully: ${newLead.id}`);

    return new Response(JSON.stringify({
      success: true,
      action: 'new_lead_created',
      lead_id: newLead.id,
      post_id: postId,
      is_client: clientMatch.isClient,
      has_client_history: clientHistoryAnalysis.hasPreviousClientCompany,
      approach_message_generated: approachMessageResult?.success || false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(`❌ Error processing lead for post ${postId}:`, error);
    
    await supabaseClient
      .from('linkedin_posts')
      .update({
        processing_status: 'lead_creation_error',
        retry_count: (post.retry_count || 0) + 1,
        last_retry_at: new Date().toISOString()
      })
      .eq('id', postId);

    throw error;
  }
}

function extractUnipileData(unipileResponse: any) {
  console.log('🔍 Extracting Unipile data...');
  
  const workHistory = [];
  let currentCompany = null;
  let currentPosition = null;
  let currentCompanyLinkedInId = null;
  let phone = null;

  if (!unipileResponse) {
    console.log('⚠️ No Unipile response data available');
    return { workHistory, currentCompany, currentPosition, currentCompanyLinkedInId, phone };
  }

  // Extraction du téléphone
  phone = unipileResponse.phone_numbers?.[0] || unipileResponse.phone || null;

  // Extraction de l'expérience professionnelle
  const experiences = unipileResponse.work_experience || unipileResponse.linkedin_profile?.experience || [];
  
  console.log(`📋 Found ${experiences.length} work experiences`);
  
  for (const exp of experiences) {
    const workEntry = {
      company_name: exp.company || exp.companyName || 'Unknown',
      position: exp.position || exp.title || 'Unknown',
      start_date: exp.start || exp.startDate || null,
      end_date: exp.end || exp.endDate || null,
      is_current: !exp.end || exp.end === null || exp.end === '',
      company_linkedin_id: exp.company_id || exp.companyId || null
    };

    workHistory.push(workEntry);

    // Identifier l'expérience actuelle
    if (workEntry.is_current) {
      currentCompany = workEntry.company_name;
      currentPosition = workEntry.position;
      currentCompanyLinkedInId = workEntry.company_linkedin_id;
    }
  }

  // Si pas d'expérience actuelle trouvée, prendre la première
  if (!currentCompany && workHistory.length > 0) {
    const firstExp = workHistory[0];
    currentCompany = firstExp.company_name;
    currentPosition = firstExp.position;
    currentCompanyLinkedInId = firstExp.company_linkedin_id;
  }

  console.log('✅ Unipile data extracted:', {
    work_experiences: workHistory.length,
    current_company: currentCompany,
    current_position: currentPosition,
    has_phone: !!phone
  });

  return { workHistory, currentCompany, currentPosition, currentCompanyLinkedInId, phone };
}

async function checkHrProviderMatch(supabaseClient: any, companyLinkedInId: string | null) {
  if (!companyLinkedInId) {
    return { isHrProvider: false };
  }

  try {
    const { data: hrProvider, error } = await supabaseClient
      .from('hr_providers')
      .select('id, company_name')
      .eq('company_linkedin_id', companyLinkedInId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking HR provider:', error);
      return { isHrProvider: false };
    }

    if (hrProvider) {
      return {
        isHrProvider: true,
        hrProviderId: hrProvider.id,
        hrProviderName: hrProvider.company_name
      };
    }

    return { isHrProvider: false };
  } catch (error) {
    console.error('Error in HR provider check:', error);
    return { isHrProvider: false };
  }
}

async function checkExistingLead(supabaseClient: any, post: any) {
  if (!post.author_profile_id) return null;

  const { data: existingLead, error } = await supabaseClient
    .from('leads')
    .select('id, latest_post_date')
    .eq('author_profile_id', post.author_profile_id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking existing lead:', error);
    return null;
  }

  if (existingLead) {
    // Mettre à jour la date du dernier post si plus récent
    const postDate = post.posted_at_iso ? new Date(post.posted_at_iso) : null;
    const existingDate = existingLead.latest_post_date ? new Date(existingLead.latest_post_date) : null;

    if (postDate && (!existingDate || postDate > existingDate)) {
      await supabaseClient
        .from('leads')
        .update({
          latest_post_urn: post.urn,
          latest_post_url: post.url,
          latest_post_date: postDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLead.id);
    }
  }

  return existingLead;
}

async function checkClientMatch(supabaseClient: any, companyLinkedInId: string | null) {
  let isClient = false;
  let clientId = null;
  let clientName = null;

  if (!companyLinkedInId) {
    return { isClient, clientId, clientName };
  }

  try {
    const { data: client, error } = await supabaseClient
      .from('clients')
      .select('id, company_name')
      .eq('company_linkedin_id', companyLinkedInId)
      .eq('tracking_enabled', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking client match:', error);
      return { isClient, clientId, clientName };
    }

    if (client) {
      isClient = true;
      clientId = client.id;
      clientName = client.company_name;
    }

    return { isClient, clientId, clientName };
  } catch (error) {
    console.error('Error in client matching:', error);
    return { isClient, clientId, clientName };
  }
}

async function analyzeClientWorkHistory(supabaseClient: any, workHistory: any[]) {
  console.log('🔍 Analyzing work history against clients...');
  
  const previousClientCompanies = [];
  let hasPreviousClientCompany = false;

  if (!workHistory || workHistory.length === 0) {
    return { hasPreviousClientCompany, previousClientCompanies };
  }

  // Récupérer tous les clients actifs
  const { data: clients, error } = await supabaseClient
    .from('clients')
    .select('id, company_name, company_linkedin_id')
    .eq('tracking_enabled', true);

  if (error) {
    console.error('Error fetching clients for history analysis:', error);
    return { hasPreviousClientCompany, previousClientCompanies };
  }

  // Créer un map pour lookup rapide
  const clientsMap = new Map();
  clients.forEach(client => {
    if (client.company_linkedin_id) {
      clientsMap.set(client.company_linkedin_id, {
        id: client.id,
        name: client.company_name
      });
    }
  });

  // Analyser chaque expérience
  for (const experience of workHistory) {
    if (experience.company_linkedin_id && clientsMap.has(experience.company_linkedin_id)) {
      const clientInfo = clientsMap.get(experience.company_linkedin_id);
      
      hasPreviousClientCompany = true;
      previousClientCompanies.push({
        client_id: clientInfo.id,
        client_name: clientInfo.name,
        company_name: experience.company_name,
        position: experience.position,
        start_date: experience.start_date,
        end_date: experience.end_date,
        is_current: experience.is_current
      });

      console.log(`✅ Client match found in work history: ${clientInfo.name}`);
    }
  }

  console.log(`📊 Client history analysis: ${previousClientCompanies.length} matches found`);
  
  return { hasPreviousClientCompany, previousClientCompanies };
}

function buildLeadData(post: any, unipileExtraction: any, clientMatch: any, clientHistoryAnalysis: any) {
  console.log('🏗️ Building lead data...');
  
  const leadData = {
    // Données de base
    author_profile_id: post.author_profile_id,
    author_name: post.author_name || 'Unknown',
    author_headline: post.author_headline,
    author_profile_url: post.author_profile_url,
    
    // Données du post
    latest_post_urn: post.urn,
    latest_post_url: post.url,
    latest_post_date: post.posted_at_iso ? new Date(post.posted_at_iso) : null,
    text: post.text,
    title: post.title,
    url: post.url,
    posted_at_iso: post.posted_at_iso,
    posted_at_timestamp: post.posted_at_timestamp,
    apify_dataset_id: post.apify_dataset_id,
    
    // Données OpenAI
    openai_step3_categorie: post.openai_step3_categorie,
    openai_step3_postes_selectionnes: post.openai_step3_postes_selectionnes,
    openai_step3_justification: post.openai_step3_justification,
    openai_step2_localisation: post.openai_step2_localisation,
    
    // Données Unipile enrichies
    company_name: unipileExtraction.currentCompany || post.unipile_company || 'Unknown',
    company_position: unipileExtraction.currentPosition || post.unipile_position,
    company_linkedin_id: unipileExtraction.currentCompanyLinkedInId || post.unipile_company_linkedin_id,
    phone_number: unipileExtraction.phone,
    phone_retrieved_at: unipileExtraction.phone ? new Date().toISOString() : null,
    
    // Historique professionnel enrichi
    ...buildWorkHistoryFields(unipileExtraction.workHistory),
    
    // Statut client
    is_client_lead: clientMatch.isClient,
    matched_client_id: clientMatch.clientId,
    matched_client_name: clientMatch.clientName,
    
    // Historique client
    has_previous_client_company: clientHistoryAnalysis.hasPreviousClientCompany,
    previous_client_companies: clientHistoryAnalysis.previousClientCompanies,
    
    // Statuts
    processing_status: 'completed'
  };

  console.log('✅ Lead data built with enriched information');
  return leadData;
}

function buildWorkHistoryFields(workHistory: any[]) {
  const fields: any = {};
  
  // Remplir jusqu'à 5 expériences
  for (let i = 0; i < Math.min(workHistory.length, 5); i++) {
    const exp = workHistory[i];
    const num = i + 1;
    
    fields[`company_${num}_name`] = exp.company_name;
    fields[`company_${num}_position`] = exp.position;
    fields[`company_${num}_start_date`] = exp.start_date;
    fields[`company_${num}_end_date`] = exp.end_date;
    fields[`company_${num}_is_current`] = exp.is_current;
    fields[`company_${num}_linkedin_id`] = exp.company_linkedin_id;
    
    // Calculer la durée si possible
    if (exp.start_date && exp.end_date) {
      try {
        const startDate = new Date(exp.start_date);
        const endDate = new Date(exp.end_date);
        const diffTime = endDate.getTime() - startDate.getTime();
        const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44)); // Approximation
        fields[`company_${num}_duration_months`] = Math.max(1, diffMonths);
      } catch (error) {
        console.log(`Could not calculate duration for experience ${num}`);
      }
    }
  }
  
  return fields;
}

async function generateApproachMessage(supabaseClient: any, leadId: string, post: any): Promise<MessageGenerationResult> {
  console.log(`💬 Generating approach message for lead: ${leadId}`);

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.log('⚠️ OpenAI API key not configured, using default template');
      const defaultMessage = generateDefaultTemplate(post.author_name, post.openai_step3_postes_selectionnes);
      
      await supabaseClient
        .from('leads')
        .update({
          approach_message: defaultMessage,
          approach_message_generated: true,
          approach_message_generated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      return { success: true, message: defaultMessage, usedDefaultTemplate: true };
    }

    // Extraire le prénom
    const firstName = post.author_name?.split(' ')[0] || 'Professionnel(le)';
    
    // Simplifier les postes pour un nom plus usuel
    const positions = post.openai_step3_postes_selectionnes || ['profil qualifié'];
    const mainPosition = positions[0] || 'profil qualifié';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Tu génères des messages LinkedIn professionnels courts et directs pour initier un échange avec des recruteurs.

STRUCTURE OBLIGATOIRE :
1. "Bonjour [Prénom]," (saut de ligne)
2. "J'ai vu que vous recherchiez un [nom de poste usuel]." (saut de ligne)  
3. "Je connais bien ces recherches, je peux vous présenter des candidats si besoin." (saut de ligne)
4. "Auriez-vous un moment pour échanger ?"

RÈGLES :
- Utilise le prénom fourni
- Transforme le nom de poste en nom plus usuel et naturel (ex: "Développeur Full Stack" au lieu de "Développeur Full Stack Senior H/F")
- Reste professionnel mais accessible
- Maximum 280 caractères
- Format JSON : {"message_approche": "texte"}`
          },
          {
            role: 'user',
            content: `Prénom: ${firstName}
Poste recherché: ${mainPosition}
Publication: ${post.text?.substring(0, 200) || ''}`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    
    if (!result.message_approche) {
      throw new Error('No message_approche in response');
    }

    // Sauvegarder le message généré
    await supabaseClient
      .from('leads')
      .update({
        approach_message: result.message_approche,
        approach_message_generated: true,
        approach_message_generated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    console.log(`✅ Approach message generated for lead: ${leadId}`);
    return { success: true, message: result.message_approche };

  } catch (error) {
    console.error(`❌ Error generating approach message for lead ${leadId}:`, error);
    
    // Fallback vers le template par défaut
    const defaultMessage = generateDefaultTemplate(post.author_name, post.openai_step3_postes_selectionnes);
    
    await supabaseClient
      .from('leads')
      .update({
        approach_message: defaultMessage,
        approach_message_generated: true,
        approach_message_generated_at: new Date().toISOString(),
        approach_message_error: error.message
      })
      .eq('id', leadId);

    return { 
      success: true, 
      message: defaultMessage, 
      usedDefaultTemplate: true,
      error: error.message 
    };
  }
}

function generateDefaultTemplate(authorName: string, selectedPositions: string[]): string {
  const firstName = authorName?.split(' ')[0] || 'Professionnel(le)';
  const position = selectedPositions?.[0] || 'profil qualifié';
  
  return `Bonjour ${firstName},

J'ai vu que vous recherchiez un ${position}.

Je connais bien ces recherches, je peux vous présenter des candidats si besoin.

Auriez-vous un moment pour échanger ?`;
}

async function processBatchLeads(supabaseClient: any, datasetId?: string) {
  console.log('📦 Processing batch lead creation...');

  // Récupérer les posts prêts pour la création de leads
  let query = supabaseClient
    .from('linkedin_posts')
    .select('*')
    .eq('processing_status', 'processing')
    .eq('unipile_profile_scraped', true)
    .is('lead_id', null);

  if (datasetId) {
    query = query.eq('apify_dataset_id', datasetId);
  }

  const { data: posts, error } = await query
    .order('created_at', { ascending: true })
    .limit(30);

  if (error) {
    throw new Error(`Error fetching posts for lead creation: ${error.message}`);
  }

  console.log(`🔄 Found ${posts.length} posts ready for lead creation`);

  const results = [];
  for (const post of posts) {
    try {
      const response = await processSingleLead(supabaseClient, post.id, post.apify_dataset_id);
      const responseData = await response.json();
      results.push({ post_id: post.id, success: true, result: responseData });
    } catch (error) {
      results.push({ post_id: post.id, success: false, error: error.message });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const errorCount = results.length - successCount;

  return new Response(JSON.stringify({
    success: true,
    batch_size: posts.length,
    success_count: successCount,
    error_count: errorCount,
    results
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

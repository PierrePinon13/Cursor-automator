
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

interface CompanyEnrichmentResult {
  success: boolean;
  companyId?: string;
  action?: string;
  error?: string;
}

interface LeadProcessingResult {
  success: boolean;
  leadId?: string;
  action: 'created' | 'updated' | 'linked' | 'error';
  isClient: boolean;
  isHrProvider: boolean;
  hasClientHistory: boolean;
  approachMessageGenerated: boolean;
  companyEnriched: boolean;
  error?: string;
}

interface BatchSummary {
  success: boolean;
  dataset_id: string;
  batch_size: number;
  processed: number;
  leads_created: number;
  leads_updated: number;
  client_leads: number;
  hr_provider_leads: number;
  failed: number;
  errors: Array<{ post_id: string; error: string }>;
  approach_messages_generated: number;
  companies_enriched: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('👤 Lead Creation Batch Worker - Starting');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { dataset_id, batch_size = 50 } = await req.json();
    
    console.log(`🎯 Processing Lead Creation batch for dataset: ${dataset_id}`);

    // Récupérer les posts prêts pour la création de leads
    const { data: posts, error: fetchError } = await supabaseClient
      .from('linkedin_posts')
      .select('*')
      .eq('processing_status', 'queued_lead_creation')
      .eq('apify_dataset_id', dataset_id)
      .limit(batch_size);

    if (fetchError) {
      throw new Error(`Failed to fetch posts: ${fetchError.message}`);
    }

    if (!posts || posts.length === 0) {
      console.log('✅ No posts queued for Lead Creation');
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No posts to process',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📥 Processing ${posts.length} posts for Lead Creation`);

    // Récupérer les clients et HR providers pour le matching
    const [clientsResult, hrProvidersResult] = await Promise.all([
      supabaseClient.from('clients').select('*').eq('tracking_enabled', true),
      supabaseClient.from('hr_providers').select('*')
    ]);

    const clients = clientsResult.data || [];
    const hrProviders = hrProvidersResult.data || [];

    // Marquer les posts comme en traitement
    await supabaseClient
      .from('linkedin_posts')
      .update({ processing_status: 'processing_lead_creation' })
      .in('id', posts.map(p => p.id));

    // Initialiser le résumé
    const summary: BatchSummary = {
      success: true,
      dataset_id,
      batch_size: posts.length,
      processed: 0,
      leads_created: 0,
      leads_updated: 0,
      client_leads: 0,
      hr_provider_leads: 0,
      failed: 0,
      errors: [],
      approach_messages_generated: 0,
      companies_enriched: 0
    };

    // Traiter chaque post
    for (const post of posts) {
      try {
        console.log(`👤 Processing lead for post: ${post.id}`);
        
        const result = await processLeadForPost(supabaseClient, post, clients, hrProviders);
        
        updateSummaryWithResult(summary, result);
        
        // Marquer le post selon le résultat
        const finalStatus = result.success ? 'completed' : 'error_lead_creation';
        await supabaseClient
          .from('linkedin_posts')
          .update({
            processing_status: finalStatus,
            lead_id: result.leadId || null,
            last_updated_at: new Date().toISOString()
          })
          .eq('id', post.id);

      } catch (error) {
        console.error(`❌ Lead processing failed for post ${post.id}:`, error);
        summary.failed++;
        summary.errors.push({ post_id: post.id, error: error.message });
        
        await supabaseClient
          .from('linkedin_posts')
          .update({
            processing_status: 'error_lead_creation',
            retry_count: (post.retry_count || 0) + 1,
            last_retry_at: new Date().toISOString()
          })
          .eq('id', post.id);
      }
    }

    console.log('📊 Lead Creation Batch completed:', summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in lead-creation-batch-worker:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processLeadForPost(
  supabaseClient: any, 
  post: any, 
  clients: any[], 
  hrProviders: any[]
): Promise<LeadProcessingResult> {
  
  // Extraire les données Unipile
  const unipileExtraction = extractUnipileData(post.unipile_response);
  
  // Vérifier HR provider match
  const hrProviderCheck = checkHrProviderMatch(hrProviders, unipileExtraction.currentCompanyLinkedInId);
  
  if (hrProviderCheck.isHrProvider) {
    console.log('🚫 Skipping lead creation - HR provider detected:', hrProviderCheck.hrProviderName);
    return {
      success: true,
      action: 'linked',
      isClient: false,
      isHrProvider: true,
      hasClientHistory: false,
      approachMessageGenerated: false,
      companyEnriched: false
    };
  }
  
  // Vérifier client match
  const clientMatch = checkClientMatch(clients, unipileExtraction.currentCompanyLinkedInId);
  
  // Analyser l'historique professionnel vs clients
  const clientHistoryAnalysis = analyzeClientWorkHistory(clients, unipileExtraction.workHistory);
  
  // Enrichir les données de l'entreprise
  const companyEnrichment = await enrichCompanyData(supabaseClient, unipileExtraction.currentCompanyLinkedInId);
  
  // ✅ Gestion idempotente des leads
  const leadResult = await createOrUpdateLeadIdempotent(
    supabaseClient, 
    post, 
    unipileExtraction, 
    clientMatch, 
    clientHistoryAnalysis, 
    companyEnrichment
  );
  
  if (!leadResult.success) {
    return {
      success: false,
      action: 'error',
      isClient: false,
      isHrProvider: false,
      hasClientHistory: false,
      approachMessageGenerated: false,
      companyEnriched: false,
      error: leadResult.error
    };
  }
  
  // Générer le message d'approche si ce n'est pas un client
  let approachMessageGenerated = false;
  if (!clientMatch.isClient && (leadResult.action === 'created' || !leadResult.hasApproachMessage)) {
    const messageResult = await generateApproachMessage(supabaseClient, leadResult.leadId!, post);
    approachMessageGenerated = messageResult.success;
  }
  
  return {
    success: true,
    leadId: leadResult.leadId,
    action: leadResult.action,
    isClient: clientMatch.isClient,
    isHrProvider: false,
    hasClientHistory: clientHistoryAnalysis.hasPreviousClientCompany,
    approachMessageGenerated,
    companyEnriched: companyEnrichment.success
  };
}

async function createOrUpdateLeadIdempotent(
  supabaseClient: any,
  post: any,
  unipileExtraction: any,
  clientMatch: any,
  clientHistoryAnalysis: any,
  companyEnrichment: any
): Promise<{ success: boolean; leadId?: string; action: 'created' | 'updated' | 'linked'; hasApproachMessage?: boolean; error?: string }> {
  
  if (!post.author_profile_id) {
    return { success: false, action: 'error', error: 'Missing author_profile_id' };
  }

  try {
    // ✅ Vérifier si un lead existe déjà pour cet auteur
    const { data: existingLead, error: checkError } = await supabaseClient
      .from('leads')
      .select('id, latest_post_date, posted_at_timestamp, approach_message')
      .eq('author_profile_id', post.author_profile_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(`Error checking existing lead: ${checkError.message}`);
    }

    const leadData = buildLeadData(post, unipileExtraction, clientMatch, clientHistoryAnalysis, companyEnrichment);

    if (existingLead) {
      // Lead existe - vérifier si ce post est plus récent
      const postTimestamp = post.posted_at_timestamp || (post.posted_at_iso ? new Date(post.posted_at_iso).getTime() : null);
      const existingTimestamp = existingLead.posted_at_timestamp || 0;
      
      if (postTimestamp && postTimestamp > existingTimestamp) {
        console.log('📅 New post is more recent, updating lead data');
        
        const { error: updateError } = await supabaseClient
          .from('leads')
          .update(leadData)
          .eq('id', existingLead.id);
          
        if (updateError) {
          throw new Error(`Error updating existing lead: ${updateError.message}`);
        }
        
        return { 
          success: true, 
          leadId: existingLead.id, 
          action: 'updated',
          hasApproachMessage: !!existingLead.approach_message
        };
      } else {
        console.log('📅 Existing post is more recent, keeping existing data');
        return { 
          success: true, 
          leadId: existingLead.id, 
          action: 'linked',
          hasApproachMessage: !!existingLead.approach_message
        };
      }
    } else {
      // Créer un nouveau lead
      try {
        const { data: newLead, error: insertError } = await supabaseClient
          .from('leads')
          .insert(leadData)
          .select('id')
          .single();
          
        if (insertError) {
          // ✅ Gestion du doublon gracieuse
          if (insertError.code === '23505' && insertError.message.includes('leads_author_profile_id_key')) {
            console.log('🔄 Duplicate key detected, attempting to retrieve existing lead');
            
            const { data: duplicateLead, error: duplicateError } = await supabaseClient
              .from('leads')
              .select('id, approach_message')
              .eq('author_profile_id', post.author_profile_id)
              .single();
              
            if (duplicateError) {
              throw new Error(`Error retrieving duplicate lead: ${duplicateError.message}`);
            }
            
            return { 
              success: true, 
              leadId: duplicateLead.id, 
              action: 'linked',
              hasApproachMessage: !!duplicateLead.approach_message
            };
          }
          throw insertError;
        }
        
        return { 
          success: true, 
          leadId: newLead.id, 
          action: 'created',
          hasApproachMessage: false
        };
      } catch (insertError) {
        throw new Error(`Error creating new lead: ${insertError.message}`);
      }
    }
  } catch (error) {
    return { 
      success: false, 
      action: 'error', 
      error: error.message 
    };
  }
}

function updateSummaryWithResult(summary: BatchSummary, result: LeadProcessingResult) {
  summary.processed++;
  
  if (result.success) {
    if (result.action === 'created') {
      summary.leads_created++;
    } else if (result.action === 'updated') {
      summary.leads_updated++;
    }
    
    if (result.isClient) summary.client_leads++;
    if (result.isHrProvider) summary.hr_provider_leads++;
    if (result.approachMessageGenerated) summary.approach_messages_generated++;
    if (result.companyEnriched) summary.companies_enriched++;
  } else {
    summary.failed++;
    summary.errors.push({ 
      post_id: result.leadId || 'unknown', 
      error: result.error || 'Unknown error' 
    });
  }
}

async function enrichCompanyData(supabaseClient: any, companyLinkedInId: string | null): Promise<CompanyEnrichmentResult> {
  if (!companyLinkedInId) {
    return { success: false, action: 'no_linkedin_id' };
  }

  console.log(`🏢 Checking company data for LinkedIn ID: ${companyLinkedInId}`);

  try {
    // Vérifier si l'entreprise existe déjà en base
    const { data: existingCompany, error: checkError } = await supabaseClient
      .from('companies')
      .select('*')
      .eq('linkedin_id', companyLinkedInId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing company:', checkError);
      return { success: false, error: checkError.message };
    }

    // Si l'entreprise existe et est complète, on garde
    if (existingCompany && existingCompany.description && existingCompany.company_size) {
      console.log(`✅ Company ${companyLinkedInId} already enriched`);
      return { 
        success: true, 
        companyId: existingCompany.id, 
        action: 'already_enriched' 
      };
    }

    // Sinon, enrichir via fetch-company-info
    console.log(`🔍 Enriching company ${companyLinkedInId}`);
    
    const { data: enrichResult, error: enrichError } = await supabaseClient.functions.invoke('fetch-company-info', {
      body: { companyLinkedInId }
    });

    if (enrichError || !enrichResult?.success) {
      console.error(`❌ Error enriching company ${companyLinkedInId}:`, enrichError || enrichResult?.error);
      return { 
        success: false, 
        error: enrichError?.message || enrichResult?.error || 'Unknown enrichment error',
        action: 'enrichment_failed'
      };
    }

    console.log(`✅ Company ${companyLinkedInId} successfully enriched`);
    return { 
      success: true, 
      companyId: enrichResult.company?.id, 
      action: existingCompany ? 'updated' : 'created' 
    };

  } catch (error) {
    console.error(`❌ Error during company enrichment for ${companyLinkedInId}:`, error);
    return { 
      success: false, 
      error: error.message,
      action: 'enrichment_error'
    };
  }
}

function extractUnipileData(unipileResponse: any) {
  const workHistory = [];
  let currentCompany = null;
  let currentPosition = null;
  let currentCompanyLinkedInId = null;
  let phone = null;

  if (!unipileResponse) {
    return { workHistory, currentCompany, currentPosition, currentCompanyLinkedInId, phone };
  }

  // Extraire le téléphone
  phone = unipileResponse.phone_numbers?.[0] || 
          unipileResponse.phone || 
          unipileResponse.contact_info?.phone ||
          null;

  // Extraire l'expérience professionnelle
  const experiences = unipileResponse.work_experience || 
                     unipileResponse.linkedin_profile?.experience || 
                     unipileResponse.experience ||
                     [];
  
  for (const exp of experiences) {
    const workEntry = {
      company_name: exp.company || exp.companyName || 'Unknown',
      position: exp.position || exp.title || exp.job_title || 'Unknown',
      start_date: exp.start || exp.startDate || null,
      end_date: exp.end || exp.endDate || null,
      is_current: !exp.end && !exp.endDate,
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

  // Si pas d'expérience actuelle trouvée, prendre la première (la plus récente)
  if (!currentCompany && workHistory.length > 0) {
    const firstExp = workHistory[0];
    currentCompany = firstExp.company_name;
    currentPosition = firstExp.position;
    currentCompanyLinkedInId = firstExp.company_linkedin_id;
  }

  return { workHistory, currentCompany, currentPosition, currentCompanyLinkedInId, phone };
}

function checkHrProviderMatch(hrProviders: any[], companyLinkedInId: string | null) {
  if (!companyLinkedInId) {
    return { isHrProvider: false };
  }

  const hrProvider = hrProviders.find(provider => 
    provider.company_linkedin_id === companyLinkedInId
  );

  if (hrProvider) {
    return {
      isHrProvider: true,
      hrProviderId: hrProvider.id,
      hrProviderName: hrProvider.company_name
    };
  }

  return { isHrProvider: false };
}

function checkClientMatch(clients: any[], companyLinkedInId: string | null) {
  if (!companyLinkedInId) {
    return { isClient: false, clientId: null, clientName: null };
  }

  const client = clients.find(client => 
    client.company_linkedin_id === companyLinkedInId
  );

  if (client) {
    return {
      isClient: true,
      clientId: client.id,
      clientName: client.company_name
    };
  }

  return { isClient: false, clientId: null, clientName: null };
}

function analyzeClientWorkHistory(clients: any[], workHistory: any[]) {
  const previousClientCompanies = [];
  let hasPreviousClientCompany = false;

  if (!workHistory || workHistory.length === 0) {
    return { hasPreviousClientCompany, previousClientCompanies, clientHistoryAlert: null };
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
    }
  }

  // Générer l'alerte si des entreprises clientes sont trouvées
  let clientHistoryAlert = null;
  if (hasPreviousClientCompany && previousClientCompanies.length > 0) {
    if (previousClientCompanies.length === 1) {
      const company = previousClientCompanies[0];
      const dateInfo = formatWorkPeriod(company.start_date, company.end_date, company.is_current);
      clientHistoryAlert = `A travaillé chez ${company.company_name}${company.position ? ` en tant que ${company.position}` : ''}${dateInfo}.`;
    } else {
      const companyNames = previousClientCompanies.map(c => c.company_name).join(', ');
      clientHistoryAlert = `A travaillé chez plusieurs entreprises clientes : ${companyNames}.`;
    }
  }

  return { hasPreviousClientCompany, previousClientCompanies, clientHistoryAlert };
}

function formatWorkPeriod(startDate: string | null, endDate: string | null, isCurrent: boolean): string {
  if (!startDate) return '';
  
  const formatDate = (dateString: string): string => {
    try {
      let date: Date;
      if (dateString.includes('/')) {
        const [month, day, year] = dateString.split('/');
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else if (dateString.includes('-')) {
        date = new Date(dateString + (dateString.length === 7 ? '-01' : ''));
      } else if (dateString.length === 4) {
        date = new Date(dateString + '-01-01');
      } else {
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) return dateString;
      
      return date.toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formattedStart = formatDate(startDate);
  
  if (isCurrent) {
    return ` depuis ${formattedStart}`;
  } else if (endDate) {
    const formattedEnd = formatDate(endDate);
    return ` de ${formattedStart} à ${formattedEnd}`;
  } else {
    return ` depuis ${formattedStart}`;
  }
}

function buildLeadData(post: any, unipileExtraction: any, clientMatch: any, clientHistoryAnalysis: any, companyEnrichment: any) {
  // Gestion des dates
  let postTimestamp = null;
  let postDate = null;
  
  if (post.posted_at_timestamp) {
    postTimestamp = post.posted_at_timestamp;
    postDate = new Date(post.posted_at_timestamp);
  } else if (post.posted_at_iso) {
    postDate = new Date(post.posted_at_iso);
    postTimestamp = postDate.getTime();
  }

  // Extraire prénom et nom depuis raw_data si disponibles
  let firstName = null;
  let lastName = null;
  
  if (post.raw_data?.author_first_name && post.raw_data?.author_last_name) {
    firstName = post.raw_data.author_first_name.trim();
    lastName = post.raw_data.author_last_name.trim();
  } else if (post.author_name) {
    const nameParts = post.author_name.trim().split(' ');
    if (nameParts.length >= 2) {
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' ');
    }
  }
  
  const leadData = {
    // Données de base
    author_profile_id: post.author_profile_id,
    author_name: post.author_name || 'Unknown',
    author_headline: post.author_headline,
    author_profile_url: post.author_profile_url,
    apify_dataset_id: post.apify_dataset_id,
    
    // Données du post
    latest_post_urn: post.urn,
    latest_post_url: post.url,
    latest_post_date: postDate?.toISOString() || null,
    text: post.text || 'Content unavailable',
    title: post.title,
    url: post.url,
    posted_at_iso: post.posted_at_iso,
    posted_at_timestamp: postTimestamp,
    
    // Données OpenAI
    openai_step3_categorie: post.openai_step3_categorie,
    openai_step3_postes_selectionnes: post.openai_step3_postes_selectionnes,
    openai_step3_justification: post.openai_step3_justification,
    openai_step2_localisation: post.openai_step2_localisation,
    
    // Données Unipile
    company_name: unipileExtraction.currentCompany || post.unipile_company || 'Unknown',
    company_position: unipileExtraction.currentPosition || post.unipile_position,
    company_linkedin_id: unipileExtraction.currentCompanyLinkedInId || post.unipile_company_linkedin_id,
    unipile_company: unipileExtraction.currentCompany || post.unipile_company,
    unipile_position: unipileExtraction.currentPosition || post.unipile_position,
    unipile_company_linkedin_id: unipileExtraction.currentCompanyLinkedInId || post.unipile_company_linkedin_id,
    phone_number: unipileExtraction.phone,
    phone_retrieved_at: unipileExtraction.phone ? new Date().toISOString() : null,
    
    // Données d'entreprise enrichies
    company_id: companyEnrichment.companyId || null,
    
    // Historique professionnel
    ...buildWorkHistoryFields(unipileExtraction.workHistory),
    
    // Statut client
    is_client_lead: clientMatch.isClient,
    matched_client_id: clientMatch.clientId,
    matched_client_name: clientMatch.clientName,
    
    // Historique client avec alerte générée
    has_previous_client_company: clientHistoryAnalysis.hasPreviousClientCompany,
    previous_client_companies: clientHistoryAnalysis.previousClientCompanies,
    client_history_alert: clientHistoryAnalysis.clientHistoryAlert,
    
    // Statuts
    processing_status: 'completed',
    last_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return leadData;
}

function buildWorkHistoryFields(workHistory: any[]) {
  const fields: any = {};
  
  for (let i = 0; i < 5; i++) {
    const experience = workHistory[i];
    const index = i + 1;
    
    if (experience) {
      fields[`company_${index}_name`] = experience.company_name;
      fields[`company_${index}_position`] = experience.position;
      fields[`company_${index}_start_date`] = experience.start_date;
      fields[`company_${index}_end_date`] = experience.end_date;
      fields[`company_${index}_is_current`] = experience.is_current;
      fields[`company_${index}_linkedin_id`] = experience.company_linkedin_id;
      
      // Calculer la durée si possible
      if (experience.start_date && experience.end_date) {
        try {
          const startDate = new Date(experience.start_date);
          const endDate = new Date(experience.end_date);
          const diffTime = endDate.getTime() - startDate.getTime();
          const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44));
          fields[`company_${index}_duration_months`] = Math.max(1, diffMonths);
        } catch (error) {
          console.log(`Could not calculate duration for experience ${index}`);
        }
      }
    } else {
      fields[`company_${index}_name`] = null;
      fields[`company_${index}_position`] = null;
      fields[`company_${index}_start_date`] = null;
      fields[`company_${index}_end_date`] = null;
      fields[`company_${index}_is_current`] = false;
      fields[`company_${index}_duration_months`] = null;
      fields[`company_${index}_linkedin_id`] = null;
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

    // Extraction du prénom
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

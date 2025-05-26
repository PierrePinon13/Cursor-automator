import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { OpenAIStep1Result, OpenAIStep2Result, OpenAIStep3Result } from './openai-steps.ts';
import { UnipileScrapingResult } from './unipile-scraper.ts';
import { ClientMatchResult } from './client-matching.ts';
import { MessageGenerationResult } from './message-generation.ts';

export async function updateProcessingStatus(
  supabaseClient: ReturnType<typeof createClient>,
  postId: string,
  status: string
) {
  await supabaseClient
    .from('linkedin_posts')
    .update({ processing_status: status })
    .eq('id', postId);
}

export async function updateStep1Results(
  supabaseClient: ReturnType<typeof createClient>,
  postId: string,
  result: OpenAIStep1Result,
  data: any
) {
  await supabaseClient
    .from('linkedin_posts')
    .update({
      openai_step1_recrute_poste: result.recrute_poste,
      openai_step1_postes: result.postes,
      openai_step1_response: data
    })
    .eq('id', postId);
}

export async function updateStep2Results(
  supabaseClient: ReturnType<typeof createClient>,
  postId: string,
  result: OpenAIStep2Result,
  data: any
) {
  await supabaseClient
    .from('linkedin_posts')
    .update({
      openai_step2_reponse: result.reponse,
      openai_step2_langue: result.langue,
      openai_step2_localisation: result.localisation_detectee,
      openai_step2_raison: result.raison,
      openai_step2_response: data
    })
    .eq('id', postId);
}

export async function updateStep3Results(
  supabaseClient: ReturnType<typeof createClient>,
  postId: string,
  result: OpenAIStep3Result,
  data: any
) {
  await supabaseClient
    .from('linkedin_posts')
    .update({
      openai_step3_categorie: result.categorie,
      openai_step3_postes_selectionnes: result.postes_selectionnes,
      openai_step3_justification: result.justification,
      openai_step3_response: data
    })
    .eq('id', postId);
}

export async function updateUnipileResults(
  supabaseClient: ReturnType<typeof createClient>,
  postId: string,
  scrapingResult: UnipileScrapingResult,
  unipileData?: any
) {
  const updateData: any = {
    unipile_company: scrapingResult.company,
    unipile_position: scrapingResult.position,
    unipile_company_linkedin_id: scrapingResult.company_id, // Save the company LinkedIn ID
    unipile_profile_scraped: scrapingResult.success,
    unipile_profile_scraped_at: new Date().toISOString()
  };

  if (unipileData) {
    updateData.unipile_response = unipileData;
  }

  console.log('Updating Unipile results with data:', updateData);

  await supabaseClient
    .from('linkedin_posts')
    .update(updateData)
    .eq('id', postId);
}

export async function updateClientMatchResults(
  supabaseClient: ReturnType<typeof createClient>,
  postId: string,
  clientMatch: ClientMatchResult
) {
  const updateData: any = {
    is_client_lead: clientMatch.isClientLead,
    matched_client_id: clientMatch.clientId || null,
    matched_client_name: clientMatch.clientName || null
  };

  console.log('Updating client match results:', updateData);

  await supabaseClient
    .from('linkedin_posts')
    .update(updateData)
    .eq('id', postId);
}

export async function updateApproachMessage(
  supabaseClient: ReturnType<typeof createClient>,
  postId: string,
  messageResult: MessageGenerationResult
) {
  const updateData: any = {
    approach_message_generated: messageResult.success,
    approach_message_generated_at: new Date().toISOString()
  };

  if (messageResult.success && messageResult.message) {
    updateData.approach_message = messageResult.message;
  }

  if (!messageResult.success && messageResult.error) {
    updateData.approach_message_error = messageResult.error;
  }

  console.log('Updating approach message results:', updateData);

  await supabaseClient
    .from('linkedin_posts')
    .update(updateData)
    .eq('id', postId);
}

export async function fetchPost(
  supabaseClient: ReturnType<typeof createClient>,
  postId: string
) {
  const { data: post, error: fetchError } = await supabaseClient
    .from('linkedin_posts')
    .select('*')
    .eq('id', postId)
    .single();

  if (fetchError || !post) {
    throw new Error('Post not found');
  }

  return post;
}

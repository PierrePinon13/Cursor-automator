
import { executeStep1, executeStep2, executeStep3 } from './openai-steps.ts'
import { scrapLinkedInProfile } from './unipile-scraper.ts'
import { updateProcessingStatus, updateStep1Results, updateStep2Results, updateStep3Results, updateUnipileResults, updateClientMatchResults, updateApproachMessage } from './database-operations.ts'
import { checkIfLeadIsFromClient } from './client-matching.ts'
import { generateApproachMessageWithRetry } from './message-generation.ts'
import { handleLeadDeduplication } from './lead-deduplication.ts'
import { ProcessingContext } from './types.ts'

export async function executeOpenAIStep1(context: ProcessingContext) {
  console.log('Starting OpenAI Step 1: Job posting detection')
  const step1Response = await executeStep1(context.openAIApiKey, context.post)
  await updateStep1Results(context.supabaseClient, context.postId, step1Response.result, step1Response.data)
  
  // Log the actual response for debugging
  console.log('Step 1 detailed response:', JSON.stringify(step1Response.result))
  
  return step1Response
}

export async function executeOpenAIStep2(context: ProcessingContext) {
  console.log('Starting OpenAI Step 2: Language and location analysis')
  const step2Response = await executeStep2(context.openAIApiKey, context.post)
  await updateStep2Results(context.supabaseClient, context.postId, step2Response.result, step2Response.data)
  
  // Log the actual response for debugging
  console.log('Step 2 detailed response:', JSON.stringify(step2Response.result))
  
  return step2Response
}

export async function executeOpenAIStep3(context: ProcessingContext, step1Result: any) {
  console.log('Starting OpenAI Step 3: Category and job analysis')
  const step3Response = await executeStep3(context.openAIApiKey, context.post, step1Result)
  await updateStep3Results(context.supabaseClient, context.postId, step3Response.result, step3Response.data)
  
  // Log the actual response for debugging
  console.log('Step 3 detailed response:', JSON.stringify(step3Response.result))
  
  return step3Response
}

export async function executeUnipileScraping(context: ProcessingContext) {
  console.log('Starting Unipile profile scraping')
  const scrapingResult = await scrapLinkedInProfile(
    context.unipileApiKey,
    context.post.author_profile_id,
    context.post.author_profile_url,
    context.supabaseClient
  )
  await updateUnipileResults(context.supabaseClient, context.postId, scrapingResult, { scrapingResult })
  return scrapingResult
}

export async function executeClientMatching(context: ProcessingContext, scrapingResult: any) {
  console.log('Starting client matching')
  const clientMatch = await checkIfLeadIsFromClient(context.supabaseClient, scrapingResult.company_id)
  await updateClientMatchResults(context.supabaseClient, context.postId, clientMatch)
  return clientMatch
}

export async function executeMessageGeneration(context: ProcessingContext, step3Result: any, step2Result: any, clientMatch: any) {
  if (!clientMatch.isClientLead) {
    console.log('Lead is not a client, generating approach message with retry system')
    
    // Utiliser le nouveau système de retry
    const messageResult = await generateApproachMessageWithRetry(
      context.openAIApiKey,
      context.post,
      context.post.author_name,
      step3Result.postes_selectionnes
    )
    
    // Log détaillé du résultat
    if (messageResult.usedDefaultTemplate) {
      console.log(`⚠️ Used default template after ${messageResult.attempts} failed attempts`)
    } else {
      console.log(`✅ Successfully generated AI message on attempt ${messageResult.attempts}`)
    }
    
    await updateApproachMessage(context.supabaseClient, context.postId, messageResult)
    return messageResult
  } else {
    console.log('Lead is a client, skipping approach message generation')
    return null
  }
}

export async function executeLeadDeduplication(context: ProcessingContext) {
  console.log('Starting lead deduplication')
  const { fetchPost } = await import('./database-operations.ts')
  const updatedPost = await fetchPost(context.supabaseClient, context.postId)
  const deduplicationResult = await handleLeadDeduplication(context.supabaseClient, updatedPost)
  console.log('Deduplication result:', deduplicationResult)
  return deduplicationResult
}

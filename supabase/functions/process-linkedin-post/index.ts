
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { processOpenAIStep1, processOpenAIStep2, processOpenAIStep3 } from './openai-steps.ts'
import { processUnipileProfile } from './unipile-scraper.ts'
import { updateProcessingStatus, updateStep1Results, updateStep2Results, updateStep3Results, updateUnipileResults, updateClientMatchResults, updateApproachMessage, fetchPost, updateRetryCount } from './database-operations.ts'
import { checkIfLeadIsFromClient } from './client-matching.ts'
import { generateApproachMessage } from './message-generation.ts'
import { handleLeadDeduplication } from './lead-deduplication.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_RETRY_ATTEMPTS = 3;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('LinkedIn post processing started')
    
    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse the incoming request
    const { postId, isRetry = false } = await req.json()
    
    if (!postId) {
      console.error('No post ID provided')
      return new Response('No post ID provided', { 
        status: 400,
        headers: corsHeaders 
      })
    }

    console.log('Processing post:', postId, isRetry ? '(retry)' : '(first attempt)')

    // Fetch the post from database
    const post = await fetchPost(supabaseClient, postId)
    console.log('Post fetched:', post.id)

    // Check retry count for retry attempts
    if (isRetry) {
      const retryCount = post.retry_count || 0;
      if (retryCount >= MAX_RETRY_ATTEMPTS) {
        console.log(`Post ${postId} has reached max retry attempts (${MAX_RETRY_ATTEMPTS}), marking as failed`);
        await updateProcessingStatus(supabaseClient, postId, 'failed_max_retries');
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Max retry attempts reached',
          postId: postId
        }), { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Increment retry count
      await updateRetryCount(supabaseClient, postId, retryCount + 1);
      console.log(`Retry attempt ${retryCount + 1} for post ${postId}`);
    }

    // Mark as processing
    await updateProcessingStatus(supabaseClient, postId, 'processing')

    // Step 1: OpenAI analysis to determine if it's a job posting
    console.log('Starting OpenAI Step 1: Job posting detection')
    const step1Result = await processOpenAIStep1(post.text)
    await updateStep1Results(supabaseClient, postId, step1Result, step1Result)

    if (step1Result.recrute_poste !== 'oui') {
      console.log('Post is not a job posting, marking as completed')
      await updateProcessingStatus(supabaseClient, postId, 'not_job_posting')
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Post is not a job posting',
        postId: postId
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Step 2: OpenAI analysis for language and location
    console.log('Starting OpenAI Step 2: Language and location analysis')
    const step2Result = await processOpenAIStep2(post.text)
    await updateStep2Results(supabaseClient, postId, step2Result, step2Result)

    if (step2Result.reponse !== 'oui') {
      console.log('Post does not meet language/location criteria')
      await updateProcessingStatus(supabaseClient, postId, 'filtered_out')
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Post filtered out due to language/location criteria',
        postId: postId
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Step 3: OpenAI analysis for category and job selection
    console.log('Starting OpenAI Step 3: Category and job analysis')
    const step3Result = await processOpenAIStep3(post.text, step1Result.postes)
    await updateStep3Results(supabaseClient, postId, step3Result, step3Result)

    // Step 4: Unipile profile scraping
    console.log('Starting Unipile profile scraping')
    const scrapingResult = await processUnipileProfile(post.author_profile_url)
    await updateUnipileResults(supabaseClient, postId, scrapingResult, scrapingResult.raw_data)

    // Step 5: Check if this is a client lead
    console.log('Starting client matching')
    const clientMatch = await checkIfLeadIsFromClient(supabaseClient, scrapingResult.company_id)
    await updateClientMatchResults(supabaseClient, postId, clientMatch)

    // Step 6: Generate approach message for non-client leads
    if (!clientMatch.isClientLead) {
      console.log('Lead is not a client, generating approach message')
      const messageResult = await generateApproachMessage(
        post.author_name,
        step3Result.postes_selectionnes,
        step3Result.categorie,
        step2Result.localisation_detectee
      )
      await updateApproachMessage(supabaseClient, postId, messageResult)
    } else {
      console.log('Lead is a client, skipping approach message generation')
    }

    // Step 7: Handle lead deduplication
    console.log('Starting lead deduplication')
    const updatedPost = await fetchPost(supabaseClient, postId)
    const deduplicationResult = await handleLeadDeduplication(supabaseClient, updatedPost)
    
    console.log('Deduplication result:', deduplicationResult)

    // Mark as completed or update status based on deduplication
    let finalStatus = 'completed'
    if (deduplicationResult.action === 'error') {
      finalStatus = 'deduplication_error'
    } else if (deduplicationResult.isExisting) {
      finalStatus = 'duplicate'
    }

    await updateProcessingStatus(supabaseClient, postId, finalStatus)

    console.log('LinkedIn post processing completed successfully')

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Post processed successfully',
      postId: postId,
      isJobPosting: step1Result.recrute_poste === 'oui',
      meetsLocationCriteria: step2Result.reponse === 'oui',
      category: step3Result.categorie,
      selectedPositions: step3Result.postes_selectionnes,
      company: scrapingResult.company,
      position: scrapingResult.position,
      isClientLead: clientMatch.isClientLead,
      clientName: clientMatch.clientName,
      deduplication: deduplicationResult,
      finalStatus: finalStatus
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('Error in process-linkedin-post function:', error)
    
    // Parse postId from request if possible for retry scheduling
    let postId = null;
    try {
      const requestBody = await req.clone().json();
      postId = requestBody.postId;
    } catch (parseError) {
      console.error('Could not parse postId from request for retry scheduling');
    }

    // If we have a postId, schedule a retry
    if (postId) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        const post = await fetchPost(supabaseClient, postId);
        const retryCount = post.retry_count || 0;
        
        if (retryCount < MAX_RETRY_ATTEMPTS) {
          console.log(`Scheduling retry for post ${postId} (attempt ${retryCount + 1})`);
          await updateProcessingStatus(supabaseClient, postId, 'retry_scheduled');
          await updateRetryCount(supabaseClient, postId, retryCount + 1);
          
          // Schedule retry after 5 minutes
          setTimeout(async () => {
            try {
              await supabaseClient.functions.invoke('process-linkedin-post', {
                body: { postId: postId, isRetry: true }
              });
            } catch (retryError) {
              console.error('Error scheduling retry:', retryError);
            }
          }, 5 * 60 * 1000); // 5 minutes delay
        } else {
          console.log(`Post ${postId} has reached max retry attempts, marking as failed`);
          await updateProcessingStatus(supabaseClient, postId, 'failed_max_retries');
        }
      } catch (retryScheduleError) {
        console.error('Error scheduling retry:', retryScheduleError);
      }
    }

    return new Response('Internal server error', { 
      status: 500,
      headers: corsHeaders
    })
  }
})

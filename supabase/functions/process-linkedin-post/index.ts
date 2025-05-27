
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { updateProcessingStatus, fetchPost } from './database-operations.ts'
import { handleRetryLogic, scheduleRetry } from './retry-handler.ts'
import { 
  executeOpenAIStep1, 
  executeOpenAIStep2, 
  executeOpenAIStep3, 
  executeUnipileScraping,
  executeClientMatching,
  executeMessageGeneration,
  executeLeadDeduplication
} from './processing-steps.ts'
import { buildSuccessResponse, buildNotJobPostingResponse, buildFilteredOutResponse } from './response-builder.ts'
import { ProcessingContext } from './types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    // Handle retry logic
    const retryResult = await handleRetryLogic(postId, isRetry)
    if (!retryResult.shouldContinue) {
      return new Response(JSON.stringify(retryResult.response), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch the post from database
    const post = await fetchPost(supabaseClient, postId)
    console.log('Post fetched:', post.id)

    // Create processing context
    const context: ProcessingContext = {
      postId,
      post,
      supabaseClient,
      openAIApiKey: Deno.env.get('OPENAI_API_KEY') ?? '',
      unipileApiKey: Deno.env.get('UNIPILE_API_KEY') ?? '',
      isRetry
    }

    // Mark as processing
    await updateProcessingStatus(supabaseClient, postId, 'processing')

    // Step 1: OpenAI analysis to determine if it's a job posting
    const step1Response = await executeOpenAIStep1(context)

    if (step1Response.result.recrute_poste !== 'oui') {
      console.log('Post is not a job posting, marking as completed')
      await updateProcessingStatus(supabaseClient, postId, 'not_job_posting')
      return new Response(JSON.stringify(buildNotJobPostingResponse(postId)), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Step 2: OpenAI analysis for language and location
    const step2Response = await executeOpenAIStep2(context)

    if (step2Response.result.reponse !== 'oui') {
      console.log('Post does not meet language/location criteria')
      await updateProcessingStatus(supabaseClient, postId, 'filtered_out')
      return new Response(JSON.stringify(buildFilteredOutResponse(postId)), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Step 3: OpenAI analysis for category and job selection
    const step3Response = await executeOpenAIStep3(context, step1Response.result)

    // Step 4: Unipile profile scraping
    const scrapingResult = await executeUnipileScraping(context)

    // Step 5: Check if this is a client lead
    const clientMatch = await executeClientMatching(context, scrapingResult)

    // Step 6: Generate approach message for non-client leads
    await executeMessageGeneration(context, step3Response.result, step2Response.result, clientMatch)

    // Step 7: Handle lead deduplication
    const deduplicationResult = await executeLeadDeduplication(context)

    // Determine final status based on deduplication
    let finalStatus = 'completed'
    if (deduplicationResult.action === 'error') {
      finalStatus = 'deduplication_error'
    } else if (deduplicationResult.isExisting) {
      finalStatus = 'duplicate'
    }

    await updateProcessingStatus(supabaseClient, postId, finalStatus)

    console.log('LinkedIn post processing completed successfully')

    const successResponse = buildSuccessResponse(
      postId,
      step1Response.result,
      step2Response.result,
      step3Response.result,
      scrapingResult,
      clientMatch,
      deduplicationResult,
      finalStatus
    )

    return new Response(JSON.stringify(successResponse), { 
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

    // Schedule retry if we have a postId
    await scheduleRetry(postId, error)

    return new Response('Internal server error', { 
      status: 500,
      headers: corsHeaders
    })
  }
})

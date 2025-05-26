
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { executeStep1, executeStep2, executeStep3 } from './openai-steps.ts';
import { scrapLinkedInProfile } from './unipile-scraper.ts';
import { checkIfLeadIsFromClient } from './client-matching.ts';
import { 
  updateProcessingStatus, 
  updateStep1Results, 
  updateStep2Results, 
  updateStep3Results,
  updateUnipileResults,
  updateClientMatchResults,
  fetchPost 
} from './database-operations.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postId } = await req.json();
    
    if (!postId) {
      return new Response('Post ID is required', { status: 400, headers: corsHeaders });
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get API keys
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response('OpenAI API key not configured', { status: 500, headers: corsHeaders });
    }

    const unipileApiKey = Deno.env.get('UNIPILE_API_KEY');
    if (!unipileApiKey) {
      console.error('Unipile API key not configured');
      return new Response('Unipile API key not configured', { status: 500, headers: corsHeaders });
    }

    console.log('API keys found, starting processing...');

    // Fetch the post data
    const post = await fetchPost(supabaseClient, postId);
    console.log('Processing post:', post.id);

    // Update status to processing
    await updateProcessingStatus(supabaseClient, postId, 'processing');

    // Step 1: Check if post shows recruitment need
    const { result: step1Result, data: step1Data } = await executeStep1(openAIApiKey, post);
    await updateStep1Results(supabaseClient, postId, step1Result, step1Data);

    // If step 1 says "Non", filter out and stop processing
    if (step1Result.recrute_poste !== 'Oui') {
      console.log('Post filtered out at step 1 - no recruitment detected');
      await updateProcessingStatus(supabaseClient, postId, 'filtered_out');
      
      return new Response(JSON.stringify({ success: true, filtered_at: 'step1' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Step 2: Check if recruitment is probably in France
    const { result: step2Result, data: step2Data } = await executeStep2(openAIApiKey, post);
    await updateStep2Results(supabaseClient, postId, step2Result, step2Data);

    // If step 2 says "Non", filter out and stop processing
    if (step2Result.reponse !== 'Oui') {
      console.log('Post filtered out at step 2 - not in France/target zone');
      await updateProcessingStatus(supabaseClient, postId, 'filtered_out');
      
      return new Response(JSON.stringify({ success: true, filtered_at: 'step2' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Step 3: Categorize the selected positions
    const { result: step3Result, data: step3Data } = await executeStep3(openAIApiKey, post, step1Result);
    await updateStep3Results(supabaseClient, postId, step3Result, step3Data);

    // Step 4: Scrap LinkedIn profile via Unipile
    const scrapingResult = await scrapLinkedInProfile(unipileApiKey, post.author_profile_id);
    await updateUnipileResults(supabaseClient, postId, scrapingResult);

    // Step 5: Check if the lead's company matches any existing client
    const clientMatch = await checkIfLeadIsFromClient(supabaseClient, scrapingResult.company_id);
    await updateClientMatchResults(supabaseClient, postId, clientMatch);

    // Mark as completed
    await updateProcessingStatus(supabaseClient, postId, 'completed');

    console.log('Post processing completed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      postId,
      step1: step1Result,
      step2: step2Result,
      step3: step3Result,
      clientMatch: clientMatch
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in process-linkedin-post function:', error);
    
    // Update status to error if we have a postId
    if (req.body?.postId) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        await updateProcessingStatus(supabaseClient, req.body.postId, 'error');
      } catch (updateError) {
        console.error('Failed to update error status:', updateError);
      }
    }
    
    return new Response('Internal server error', { 
      status: 500,
      headers: corsHeaders
    });
  }
});

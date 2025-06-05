import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CorrelationLogger, updatePostWithCorrelation, handleWorkerError } from '../shared/correlation-logger.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { post_id, dataset_id, batch_mode = false, workflow_trigger = false } = await req.json();

    if (batch_mode) {
      return await processBatchUnipile(supabaseClient, dataset_id);
    } else if (post_id) {
      return await processSingleUnipile(supabaseClient, post_id, dataset_id, workflow_trigger);
    } else {
      throw new Error('Either post_id or batch_mode must be provided');
    }

  } catch (error) {
    console.error('❌ Error in specialized-unipile-worker:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processSingleUnipile(supabaseClient: any, postId: string, datasetId?: string, workflowTrigger = false) {
  const correlationId = CorrelationLogger.generateCorrelationId();
  const logger = new CorrelationLogger({
    correlationId,
    postId,
    step: 'unipile_scraping',
    datasetId
  });

  const startTime = Date.now();
  
  try {
    await logger.logStepStart();
    
    // Récupérer le post
    const { data: post, error: postError } = await supabaseClient
      .from('linkedin_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      throw new Error(`Post not found: ${postId}`);
    }

    if (!post.author_profile_id) {
      logger.warn('No author_profile_id available for scraping');
      const duration = Date.now() - startTime;
      await logger.logStepEnd({ skipped: true }, duration);
      
      if (workflowTrigger) {
        await triggerNextStep(supabaseClient, postId, datasetId, logger);
      }
      
      return new Response(JSON.stringify({
        success: false,
        reason: 'No author_profile_id available',
        post_id: postId,
        correlation_id: correlationId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Récupérer un compte Unipile disponible
    const accountId = await getAvailableUnipileAccount(supabaseClient, logger);
    if (!accountId) {
      throw new Error('No Unipile account available for scraping');
    }
    
    // Appeler unipile-queue pour le scraping de profil
    logger.info('Calling unipile-queue for profile scraping');
    const { data: queueResult, error: queueError } = await supabaseClient.functions.invoke('unipile-queue', {
      body: {
        action: 'execute',
        account_id: accountId,
        operation: 'scrape_profile',
        payload: {
          authorProfileId: post.author_profile_id
        },
        priority: false
      }
    });

    if (queueError || !queueResult?.success) {
      throw new Error(`Failed to scrape profile via unipile-queue: ${queueError?.message || queueResult?.error || 'Unknown error'}`);
    }

    const unipileData = queueResult.result;
    const extractedData = extractProfileData(unipileData);

    // Mettre à jour le post avec les résultats du scraping
    const updateData: any = {
      unipile_profile_scraped: true,
      unipile_profile_scraped_at: new Date().toISOString(),
      unipile_response: unipileData,
      unipile_company: extractedData.company,
      unipile_position: extractedData.position,
      unipile_company_linkedin_id: extractedData.company_id
    };

    if (extractedData.phone) {
      updateData.phone_number = extractedData.phone;
      updateData.phone_retrieved_at = new Date().toISOString();
    }

    await updatePostWithCorrelation(supabaseClient, postId, correlationId, updateData);

    const duration = Date.now() - startTime;
    await logger.logStepEnd({
      success: true,
      company: extractedData.company,
      position: extractedData.position,
      phone_found: !!extractedData.phone
    }, duration);

    // Déclencher l'étape suivante si c'est un workflow
    if (workflowTrigger) {
      await triggerNextStep(supabaseClient, postId, datasetId, logger);
    }

    return new Response(JSON.stringify({
      success: true,
      extracted_data: extractedData,
      post_id: postId,
      dataset_id: datasetId,
      correlation_id: correlationId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    await logger.logStepError(error, duration);
    await handleWorkerError(supabaseClient, postId, correlationId, 'unipile_scraping', error);

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      post_id: postId,
      correlation_id: correlationId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function getAvailableUnipileAccount(supabaseClient: any, logger: CorrelationLogger): Promise<string | null> {
  logger.info('Fetching available Unipile accounts');
  
  const { data: accounts, error } = await supabaseClient
    .from('profiles')
    .select('unipile_account_id')
    .not('unipile_account_id', 'is', null);

  if (error) {
    logger.error('Error fetching Unipile accounts', error);
    return null;
  }

  if (!accounts || accounts.length === 0) {
    logger.error('No Unipile accounts found');
    return null;
  }

  const selectedAccount = accounts[0].unipile_account_id;
  logger.info('Selected Unipile account', { account_id: selectedAccount });
  
  return selectedAccount;
}

function extractProfileData(unipileData: any) {
  let company = null;
  let position = null;
  let company_id = null;
  
  const experiences = unipileData.work_experience || unipileData.linkedin_profile?.experience || [];
  
  if (experiences.length > 0) {
    const currentExperience = experiences.find((exp: any) => 
      !exp.end || exp.end === null || exp.end === ''
    ) || experiences[0];

    if (currentExperience) {
      company = currentExperience.company || currentExperience.companyName || null;
      position = currentExperience.position || currentExperience.title || null;
      company_id = currentExperience.company_id || currentExperience.companyId || null;
    }
  }

  const phone = unipileData.phone_numbers?.[0] || unipileData.phone;

  return { company, position, company_id, phone };
}

async function triggerNextStep(supabaseClient: any, postId: string, datasetId?: string, logger?: CorrelationLogger) {
  try {
    await supabaseClient.functions.invoke('specialized-company-worker', {
      body: { 
        post_id: postId,
        dataset_id: datasetId,
        workflow_trigger: true
      }
    });
    logger?.success('Company verification triggered');
  } catch (error) {
    logger?.error('Error triggering company verification', error);
  }
}

// ... keep existing code (processBatchUnipile function)
async function processBatchUnipile(supabaseClient: any, datasetId?: string) {
  const correlationId = CorrelationLogger.generateCorrelationId();
  const logger = new CorrelationLogger({
    correlationId,
    postId: 'BATCH',
    step: 'unipile_batch',
    datasetId
  });

  logger.info(`Processing Unipile batch for dataset: ${datasetId}`);
  
  let query = supabaseClient
    .from('linkedin_posts')
    .select('*')
    .eq('openai_step3_categorie', 'Développeur')
    .eq('unipile_profile_scraped', false)
    .not('author_profile_id', 'is', null)
    .limit(20);

  if (datasetId) {
    query = query.eq('apify_dataset_id', datasetId);
  }

  const { data: posts, error } = await query;

  if (error) {
    throw new Error(`Error fetching posts for Unipile scraping: ${error.message}`);
  }

  logger.info(`Found ${posts.length} posts for Unipile processing`);

  let processed = 0;
  let errors = 0;

  // Traitement séquentiel pour respecter le rate limiting
  for (const post of posts) {
    try {
      await processSingleUnipile(supabaseClient, post.id, post.apify_dataset_id, false);
      processed++;
      
      // Délai entre chaque requête pour rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      logger.error(`Error processing Unipile for post ${post.id}`, error);
      errors++;
    }
  }

  return new Response(JSON.stringify({
    success: true,
    batch_mode: true,
    dataset_id: datasetId,
    processed_count: processed,
    error_count: errors,
    total_found: posts.length,
    correlation_id: correlationId
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

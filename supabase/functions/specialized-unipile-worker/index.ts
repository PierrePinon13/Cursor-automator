
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting per account
const lastCallTimes = new Map<string, number>();
const accountQueues = new Map<string, Array<() => Promise<any>>>();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Specialized Unipile Worker started');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { post_id, dataset_id, batch_mode = false } = await req.json();
    
    if (batch_mode) {
      return await processBatchUnipile(supabaseClient, dataset_id);
    } else {
      return await processSinglePost(supabaseClient, post_id, dataset_id);
    }

  } catch (error) {
    console.error('❌ Error in specialized-unipile-worker:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processSinglePost(supabaseClient: any, postId: string, datasetId: string) {
  console.log(`🎯 Processing Unipile scraping for post: ${postId}`);

  // Récupérer le post
  const { data: post, error: fetchError } = await supabaseClient
    .from('linkedin_posts')
    .select('*')
    .eq('id', postId)
    .single();

  if (fetchError || !post) {
    throw new Error(`Post not found: ${postId}`);
  }

  if (!post.author_profile_id) {
    console.log(`⚠️ No author_profile_id for post ${postId}, marking as scraped with null data`);
    await supabaseClient
      .from('linkedin_posts')
      .update({
        unipile_profile_scraped: true,
        unipile_profile_scraped_at: new Date().toISOString(),
        unipile_company: null,
        unipile_position: null
      })
      .eq('id', postId);
    
    // Déclencher la création de lead
    await triggerLeadCreation(supabaseClient, postId, datasetId);
    return { success: true, skipped: true };
  }

  // Récupérer un compte Unipile disponible
  const accountId = await getAvailableUnipileAccount(supabaseClient);
  if (!accountId) {
    throw new Error('No Unipile accounts available');
  }

  try {
    const scrapingResult = await scrapeWithRateLimit(
      supabaseClient, 
      accountId, 
      post.author_profile_id, 
      postId
    );

    // Déclencher la création de lead
    await triggerLeadCreation(supabaseClient, postId, datasetId);

    return { 
      success: true, 
      post_id: postId,
      scraping_result: scrapingResult,
      account_used: accountId
    };

  } catch (error) {
    await handleUnipileError(supabaseClient, postId, error);
    throw error;
  }
}

async function processBatchUnipile(supabaseClient: any, datasetId?: string) {
  console.log('📦 Processing batch Unipile scraping...');

  // Récupérer les posts en attente de scraping
  let query = supabaseClient
    .from('linkedin_posts')
    .select('*')
    .eq('processing_status', 'processing')
    .eq('openai_step2_reponse', 'oui')
    .eq('unipile_profile_scraped', false)
    .not('author_profile_id', 'is', null);

  if (datasetId) {
    query = query.eq('apify_dataset_id', datasetId);
  }

  const { data: posts, error } = await query
    .order('processing_priority', { ascending: true })
    .limit(20);

  if (error) {
    throw new Error(`Error fetching posts for Unipile scraping: ${error.message}`);
  }

  // Récupérer tous les comptes Unipile disponibles
  const { data: accounts, error: accountsError } = await supabaseClient
    .from('profiles')
    .select('unipile_account_id')
    .not('unipile_account_id', 'is', null);

  if (accountsError || !accounts?.length) {
    throw new Error('No Unipile accounts available');
  }

  console.log(`🔄 Found ${posts.length} posts to scrape with ${accounts.length} accounts`);

  // Distribuer les posts entre les comptes disponibles
  const accountIds = accounts.map(acc => acc.unipile_account_id);
  const results = [];

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const accountId = accountIds[i % accountIds.length]; // Distribution round-robin

    try {
      // Traitement asynchrone avec rate limiting par compte
      const scrapingPromise = scrapeWithRateLimit(
        supabaseClient, 
        accountId, 
        post.author_profile_id, 
        post.id
      );

      results.push({
        post_id: post.id,
        account_id: accountId,
        promise: scrapingPromise
      });

    } catch (error) {
      console.error(`❌ Error setting up scraping for post ${post.id}:`, error);
    }
  }

  // Attendre tous les résultats (avec rate limiting appliqué)
  const completedResults = await Promise.allSettled(
    results.map(r => r.promise)
  );

  let successCount = 0;
  let errorCount = 0;

  completedResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successCount++;
      // Déclencher la création de lead pour ce post
      const postId = results[index].post_id;
      triggerLeadCreation(supabaseClient, postId, datasetId).catch(err => {
        console.error(`Error triggering lead creation for ${postId}:`, err);
      });
    } else {
      errorCount++;
      console.error(`Scraping failed for post ${results[index].post_id}:`, result.reason);
    }
  });

  return {
    success: true,
    batch_size: posts.length,
    success_count: successCount,
    error_count: errorCount,
    accounts_used: accountIds.length
  };
}

async function scrapeWithRateLimit(supabaseClient: any, accountId: string, authorProfileId: string, postId: string) {
  console.log(`🔍 Scraping profile ${authorProfileId} with account ${accountId}`);

  // Appliquer le rate limiting par compte
  await applyRateLimit(accountId);

  const unipileApiKey = Deno.env.get('UNIPILE_API_KEY');
  if (!unipileApiKey) {
    throw new Error('Unipile API key not configured');
  }

  const unipileUrl = `https://api9.unipile.com:13946/api/v1/users/${authorProfileId}?account_id=${accountId}&linkedin_sections=experience`;
  
  const response = await fetch(unipileUrl, {
    method: 'GET',
    headers: {
      'X-API-KEY': unipileApiKey,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Unipile API error for ${postId}:`, response.status, errorText);
    throw new Error(`Unipile API error: ${response.status} - ${errorText}`);
  }

  const unipileData = await response.json();
  console.log(`✅ Profile scraped for post ${postId}`);

  // Extraire les informations
  const scrapingResult = extractProfileData(unipileData);

  // Sauvegarder les résultats
  await supabaseClient
    .from('linkedin_posts')
    .update({
      unipile_company: scrapingResult.company,
      unipile_position: scrapingResult.position,
      unipile_company_linkedin_id: scrapingResult.company_id,
      unipile_profile_scraped: true,
      unipile_profile_scraped_at: new Date().toISOString(),
      unipile_response: unipileData
    })
    .eq('id', postId);

  // Mettre à jour le timestamp du dernier appel pour ce compte
  updateLastCallTime(accountId);

  return scrapingResult;
}

async function applyRateLimit(accountId: string) {
  const lastCall = lastCallTimes.get(accountId) || 0;
  const now = Date.now();
  const timeSinceLastCall = now - lastCall;
  
  // Random delay entre 2-8 secondes
  const randomDelay = Math.floor(Math.random() * 6000) + 2000;
  
  if (timeSinceLastCall < randomDelay) {
    const waitTime = randomDelay - timeSinceLastCall;
    console.log(`⏳ Rate limiting: waiting ${waitTime}ms for account ${accountId}`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
}

function updateLastCallTime(accountId: string) {
  lastCallTimes.set(accountId, Date.now());
}

async function getAvailableUnipileAccount(supabaseClient: any): Promise<string | null> {
  // Récupérer un compte qui n'a pas été utilisé récemment
  const { data: accounts, error } = await supabaseClient
    .from('profiles')
    .select('unipile_account_id')
    .not('unipile_account_id', 'is', null);

  if (error || !accounts?.length) {
    return null;
  }

  // Trouver le compte avec le délai le plus long depuis le dernier appel
  let bestAccount = accounts[0].unipile_account_id;
  let longestDelay = 0;

  for (const account of accounts) {
    const accountId = account.unipile_account_id;
    const lastCall = lastCallTimes.get(accountId) || 0;
    const delay = Date.now() - lastCall;

    if (delay > longestDelay) {
      longestDelay = delay;
      bestAccount = accountId;
    }
  }

  return bestAccount;
}

function extractProfileData(unipileData: any) {
  let company = null;
  let position = null;
  let company_id = null;
  
  // Extraire les informations depuis l'expérience
  const experiences = unipileData.work_experience || unipileData.linkedin_profile?.experience || [];
  
  if (experiences.length > 0) {
    // Trouver l'expérience actuelle
    const currentExperience = experiences.find((exp: any) => 
      !exp.end || exp.end === null || exp.end === ''
    ) || experiences[0];

    if (currentExperience) {
      company = currentExperience.company || currentExperience.companyName || null;
      position = currentExperience.position || currentExperience.title || null;
      company_id = currentExperience.company_id || currentExperience.companyId || null;
    }
  }

  const provider_id = unipileData.provider_id || unipileData.public_identifier || null;

  return { company, position, company_id, provider_id, success: true };
}

async function triggerLeadCreation(supabaseClient: any, postId: string, datasetId: string) {
  console.log(`🎯 Triggering lead creation for post: ${postId}`);
  
  supabaseClient.functions.invoke('specialized-lead-worker', {
    body: { 
      post_id: postId, 
      dataset_id: datasetId
    }
  }).catch((err: any) => {
    console.error(`Error triggering lead worker for ${postId}:`, err);
  });
}

async function handleUnipileError(supabaseClient: any, postId: string, error: any) {
  let errorType = 'temporary_error';
  
  if (error.message.includes('429')) {
    errorType = 'unipile_rate_limit';
  } else if (error.message.includes('provider_error')) {
    errorType = 'unipile_provider_error';
  } else if (error.message.includes('401') || error.message.includes('403')) {
    errorType = 'permanent_error';
  }

  await supabaseClient
    .from('linkedin_posts')
    .update({
      processing_status: errorType === 'permanent_error' ? 'error' : 'retry_scheduled',
      retry_count: supabaseClient.rpc('increment', { x: 1 }),
      last_retry_at: new Date().toISOString()
    })
    .eq('id', postId);
}

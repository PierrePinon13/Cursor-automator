
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getAvailableUnipileAccount, applyRateLimit, updateLastCallTime } from './rate-limiter.ts'
import { scrapeWithRateLimit, extractProfileData } from './profile-scraper.ts'
import { handleUnipileError, triggerLeadCreation } from './error-handler.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    
    return new Response(JSON.stringify({ 
      success: true, 
      skipped: true,
      post_id: postId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
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

    return new Response(JSON.stringify({ 
      success: true, 
      post_id: postId,
      scraping_result: scrapingResult,
      account_used: accountId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

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
    .order('created_at', { ascending: true })
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

  return new Response(JSON.stringify({
    success: true,
    batch_size: posts.length,
    success_count: successCount,
    error_count: errorCount,
    accounts_used: accountIds.length
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

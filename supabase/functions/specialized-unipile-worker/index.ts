
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

    const requestBody = await req.json();
    console.log('📥 Request body received:', JSON.stringify(requestBody, null, 2));
    
    const { post_id, dataset_id, batch_mode = false, task_type } = requestBody;
    
    // ✅ CORRECTION : Vérification et gestion des paramètres
    if (!post_id && !dataset_id && !batch_mode) {
      console.error('❌ Missing required parameters: post_id, dataset_id, or batch_mode');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing required parameters: post_id, dataset_id, or batch_mode' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Mode batch ou dataset_id fourni sans post_id spécifique
    if (batch_mode || (dataset_id && !post_id)) {
      console.log(`📦 Processing batch Unipile scraping for dataset: ${dataset_id}`);
      return await processBatchUnipile(supabaseClient, dataset_id);
    } else if (post_id) {
      console.log(`🎯 Processing single post Unipile scraping for post: ${post_id}`);
      return await processSinglePost(supabaseClient, post_id, dataset_id);
    } else {
      console.error('❌ Invalid request: no valid processing mode detected');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid request: no valid processing mode detected' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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

async function processSinglePost(supabaseClient: any, postId: string, datasetId?: string) {
  // ✅ AMÉLIORATION : Validation du postId
  if (!postId || postId === 'undefined' || postId === 'null') {
    console.error('❌ Invalid post ID received:', postId);
    throw new Error(`Invalid post ID: ${postId}`);
  }

  console.log(`🎯 Processing Unipile scraping for post: ${postId}`);

  // Récupérer le post
  const { data: post, error: fetchError } = await supabaseClient
    .from('linkedin_posts')
    .select('*')
    .eq('id', postId)
    .single();

  if (fetchError || !post) {
    console.error(`❌ Post not found or error fetching post ${postId}:`, fetchError);
    throw new Error(`Post not found: ${postId}`);
  }

  console.log(`📋 Post found: ${post.author_name} - ${post.title?.substring(0, 50) || 'No title'}...`);

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
    await triggerLeadCreation(supabaseClient, postId, datasetId || post.apify_dataset_id);
    
    return new Response(JSON.stringify({ 
      success: true, 
      skipped: true,
      post_id: postId,
      reason: 'No author_profile_id'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Récupérer un compte Unipile disponible
  const accountId = await getAvailableUnipileAccount(supabaseClient);
  if (!accountId) {
    console.error('❌ No Unipile accounts available');
    throw new Error('No Unipile accounts available');
  }

  console.log(`🔑 Using Unipile account: ${accountId}`);

  try {
    const scrapingResult = await scrapeWithRateLimit(
      supabaseClient, 
      accountId, 
      post.author_profile_id, 
      postId
    );

    console.log(`✅ Scraping completed for post ${postId}`);

    // Déclencher la création de lead
    await triggerLeadCreation(supabaseClient, postId, datasetId || post.apify_dataset_id);

    return new Response(JSON.stringify({ 
      success: true, 
      post_id: postId,
      scraping_result: scrapingResult,
      account_used: accountId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(`❌ Scraping failed for post ${postId}:`, error);
    await handleUnipileError(supabaseClient, postId, error);
    throw error;
  }
}

async function processBatchUnipile(supabaseClient: any, datasetId?: string) {
  console.log('📦 Processing batch Unipile scraping...');

  // ✅ AMÉLIORATION : Requête plus spécifique pour les posts prêts pour Unipile
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
    .limit(50); // Réduire la limite pour éviter les timeouts

  if (error) {
    console.error('❌ Error fetching posts for Unipile scraping:', error);
    throw new Error(`Error fetching posts for Unipile scraping: ${error.message}`);
  }

  console.log(`🔄 Found ${posts.length} posts ready for Unipile scraping`);

  if (posts.length === 0) {
    return new Response(JSON.stringify({
      success: true,
      batch_size: 0,
      success_count: 0,
      error_count: 0,
      message: 'No posts ready for Unipile scraping'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Récupérer tous les comptes Unipile disponibles
  const { data: accounts, error: accountsError } = await supabaseClient
    .from('profiles')
    .select('unipile_account_id')
    .not('unipile_account_id', 'is', null);

  if (accountsError || !accounts?.length) {
    console.error('❌ No Unipile accounts available:', accountsError);
    throw new Error('No Unipile accounts available');
  }

  console.log(`🔑 Found ${accounts.length} Unipile accounts`);

  // Distribuer les posts entre les comptes disponibles
  const accountIds = accounts.map(acc => acc.unipile_account_id);
  const results = [];

  let successCount = 0;
  let errorCount = 0;

  // Traitement séquentiel pour éviter les problèmes de rate limiting
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const accountId = accountIds[i % accountIds.length]; // Distribution round-robin

    try {
      console.log(`🔍 Processing post ${i + 1}/${posts.length}: ${post.id}`);
      
      const scrapingResult = await scrapeWithRateLimit(
        supabaseClient, 
        accountId, 
        post.author_profile_id, 
        post.id
      );

      successCount++;
      console.log(`✅ Post ${post.id} processed successfully`);

      // Déclencher la création de lead
      triggerLeadCreation(supabaseClient, post.id, datasetId || post.apify_dataset_id).catch(err => {
        console.error(`Error triggering lead creation for ${post.id}:`, err);
      });

    } catch (error) {
      errorCount++;
      console.error(`❌ Error processing post ${post.id}:`, error);
      
      // Gérer l'erreur pour ce post spécifique
      await handleUnipileError(supabaseClient, post.id, error);
    }

    // Petite pause entre les posts pour éviter la surcharge
    if (i < posts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`📊 Batch completed: ${successCount} success, ${errorCount} errors`);

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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎯 Processing Queue Manager started');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, task_type, post_id, dataset_id, force_reprocess = false, timeout_protection = false, apify_api_key, force_all = false } = await req.json();

    switch (action) {
      case 'fast_webhook_processing':
        return await fastWebhookProcessing(supabaseClient, dataset_id, apify_api_key, force_all);
      
      case 'queue_posts':
        return await queuePendingPosts(supabaseClient, timeout_protection);
      
      case 'process_next_batch':
        return await processNextBatch(supabaseClient, task_type);
      
      case 'requeue_failed':
        return await requeueFailedPosts(supabaseClient, dataset_id);
      
      case 'force_reprocess':
        return await forceReprocessPost(supabaseClient, post_id);
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error('❌ Error in processing-queue-manager:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function fastWebhookProcessing(supabaseClient: any, datasetId: string, apifyApiKey: string, forceAll: boolean) {
  console.log('⚡ FAST WEBHOOK PROCESSING: Starting background task to avoid timeout');
  
  // Lancer le traitement en arrière-plan avec EdgeRuntime.waitUntil pour éviter les timeouts
  const backgroundTask = async () => {
    try {
      console.log('🔄 Background task: Starting full dataset processing...');
      
      // Récupérer les données Apify rapidement
      const limit = 1000;
      let offset = 0;
      let allItems: any[] = [];
      let batchCount = 0;

      while (true) {
        batchCount++;
        console.log(`📥 Background: Fetching batch ${batchCount}`);
        
        let apiUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?offset=${offset}&limit=${limit}&desc=1`;
        if (!forceAll) {
          apiUrl += '&skipEmpty=true';
        }
        
        const response = await fetch(apiUrl, {
          headers: { 'Authorization': `Bearer ${apifyApiKey}` }
        });
        
        if (!response.ok) break;
        
        const items = await response.json();
        if (!items || items.length === 0) break;
        
        allItems = allItems.concat(items);
        offset += limit;
        
        if (items.length < limit) break;
        
        // Petite pause pour éviter la surcharge
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`📊 Background: Collected ${allItems.length} items`);
      
      // Stocker en base rapidement
      const validRawData = allItems
        .filter(item => item && item.urn)
        .reduce((acc, item) => {
          if (!acc.find(existing => existing.urn === item.urn)) {
            acc.push({
              apify_dataset_id: datasetId,
              urn: item.urn,
              text: item.text || null,
              title: item.title || null,
              url: item.url,
              posted_at_timestamp: item.postedAtTimestamp || null,
              posted_at_iso: item.postedAt || null,
              author_type: item.authorType || null,
              author_profile_url: item.authorProfileUrl || null,
              author_profile_id: item.authorProfileId || null,
              author_name: item.authorName || null,
              author_headline: item.authorHeadline || null,
              is_repost: item.isRepost || false,
              raw_data: item,
              updated_at: new Date().toISOString()
            });
          }
          return acc;
        }, []);

      // Stockage par batches de 500
      const BATCH_SIZE = 500;
      for (let i = 0; i < validRawData.length; i += BATCH_SIZE) {
        const batch = validRawData.slice(i, i + BATCH_SIZE);
        
        await supabaseClient
          .from('linkedin_posts_raw')
          .upsert(batch, { onConflict: 'urn', ignoreDuplicates: false });
        
        console.log(`💾 Background: Stored batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(validRawData.length / BATCH_SIZE)}`);
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Classification et insertion des posts
      const qualifiedPosts = [];
      for (const item of allItems) {
        if (item && item.urn && item.url && item.authorType !== 'Company') {
          qualifiedPosts.push({
            apify_dataset_id: datasetId,
            urn: item.urn,
            text: item.text || 'Content unavailable',
            title: item.title || null,
            url: item.url,
            posted_at_timestamp: item.postedAtTimestamp || null,
            posted_at_iso: item.postedAt || null,
            author_type: item.authorType,
            author_profile_url: item.authorProfileUrl || 'Unknown',
            author_profile_id: item.authorProfileId || null,
            author_name: item.authorName || 'Unknown author',
            author_headline: item.authorHeadline || null,
            processing_status: 'pending',
            raw_data: item
          });
        }
      }
      
      // Insertion des posts qualifiés par batches
      for (let i = 0; i < qualifiedPosts.length; i += BATCH_SIZE) {
        const batch = qualifiedPosts.slice(i, i + BATCH_SIZE);
        
        await supabaseClient
          .from('linkedin_posts')
          .upsert(batch, { onConflict: 'urn', ignoreDuplicates: true });
        
        console.log(`🚀 Background: Queued batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(qualifiedPosts.length / BATCH_SIZE)}`);
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      console.log(`✅ Background task completed: ${qualifiedPosts.length} posts queued`);
      
      // ✅ CORRECTION : Déclencher le traitement OpenAI Step 1 directement
      setTimeout(async () => {
        try {
          console.log('🚀 Triggering OpenAI Step 1 processing...');
          await supabaseClient.functions.invoke('processing-queue-manager', {
            body: { action: 'queue_posts', dataset_id: datasetId, timeout_protection: true }
          });
          console.log('✅ OpenAI Step 1 processing triggered successfully');
        } catch (error) {
          console.error('❌ Error triggering OpenAI Step 1 processing:', error);
        }
      }, 5000); // 5 secondes de délai
      
    } catch (error) {
      console.error('❌ Background task error:', error);
    }
  };

  // Démarrer la tâche en arrière-plan
  if ((globalThis as any).EdgeRuntime?.waitUntil) {
    (globalThis as any).EdgeRuntime.waitUntil(backgroundTask());
  } else {
    // Fallback si EdgeRuntime n'est pas disponible
    backgroundTask().catch(console.error);
  }

  return new Response(JSON.stringify({ 
    success: true,
    message: 'Fast webhook processing started in background',
    dataset_id: datasetId
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function queuePendingPosts(supabaseClient: any, timeoutProtection: boolean = false) {
  console.log('📥 Starting OPTIMIZED queuing of pending posts...');
  
  // 🔥 CORRECTION MAJEURE : Récupérer TOUS les posts pending sans limitation
  console.log('📊 Fetching ALL pending posts without 1000 limit...');
  
  let allPendingPosts: any[] = [];
  let page = 0;
  const PAGE_SIZE = 1000;
  
  // Pagination pour récupérer TOUS les posts pending
  while (true) {
    const { data: pendingPostsPage, error } = await supabaseClient
      .from('linkedin_posts')
      .select('*')
      .eq('processing_status', 'pending')
      .order('created_at', { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Error fetching pending posts page ${page}: ${error.message}`);
    }

    if (!pendingPostsPage || pendingPostsPage.length === 0) {
      console.log(`📄 No more pending posts - stopping at page ${page}`);
      break;
    }

    console.log(`📥 Fetched page ${page + 1}: ${pendingPostsPage.length} pending posts`);
    allPendingPosts = allPendingPosts.concat(pendingPostsPage);
    
    if (pendingPostsPage.length < PAGE_SIZE) {
      console.log(`📄 Last page reached (${pendingPostsPage.length} < ${PAGE_SIZE})`);
      break;
    }
    
    page++;
  }

  console.log(`📊 Found ${allPendingPosts.length} TOTAL pending posts (NO 1000 LIMIT!)`);

  if (allPendingPosts.length === 0) {
    console.log('📝 No pending posts found for Step 1 processing');
    return new Response(JSON.stringify({ 
      success: true, 
      queued_count: 0,
      total_pending: 0,
      message: 'No pending posts found'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // 🚀 NOUVELLE STRATÉGIE : Utiliser les workers spécialisés
  const MEGA_BATCH_SIZE = timeoutProtection ? 50 : 100;
  let queuedCount = 0;
  
  // 🔥 SOLUTION ANTI-TIMEOUT : Lancer le traitement en arrière-plan
  const backgroundProcessing = async () => {
    console.log('🚀 Starting BACKGROUND processing with specialized workers...');
    
    // Regrouper par dataset pour un traitement plus efficace
    const postsByDataset = allPendingPosts.reduce((acc, post) => {
      const datasetId = post.apify_dataset_id;
      if (!acc[datasetId]) {
        acc[datasetId] = [];
      }
      acc[datasetId].push(post);
      return acc;
    }, {} as Record<string, any[]>);

    const datasets = Object.keys(postsByDataset);
    console.log(`📊 Processing ${datasets.length} datasets in background`);

    for (const datasetId of datasets) {
      const datasetPosts = postsByDataset[datasetId];
      console.log(`🔄 Processing dataset ${datasetId}: ${datasetPosts.length} posts`);
      
      for (let i = 0; i < datasetPosts.length; i += MEGA_BATCH_SIZE) {
        const batch = datasetPosts.slice(i, i + MEGA_BATCH_SIZE);
        const batchNumber = Math.floor(i / MEGA_BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(datasetPosts.length / MEGA_BATCH_SIZE);
        
        console.log(`🚀 Processing BACKGROUND batch ${batchNumber}/${totalBatches} for dataset ${datasetId} (${batch.length} posts)`);
        
        try {
          // ✅ AMÉLIORATION : Utiliser le worker Step 1 spécialisé avec logs détaillés
          console.log(`📤 Invoking openai-step1-worker for batch ${batchNumber}...`);
          console.log(`📋 Post IDs in batch: ${batch.map(p => p.id).slice(0, 5).join(', ')}${batch.length > 5 ? '...' : ''}`);
          
          const workerPromise = supabaseClient.functions.invoke('openai-step1-worker', {
            body: { 
              post_ids: batch.map(p => p.id),
              dataset_id: datasetId,
              batch_mode: true,
              timeout_protection: timeoutProtection
            }
          });

          // ✅ CORRECTION : Ajouter un traitement de la réponse pour diagnostiquer
          workerPromise.then((response: any) => {
            console.log(`✅ Worker Step 1 response for batch ${batchNumber}:`, response.data || response);
          }).catch((err: any) => {
            console.error(`⚠️ Error triggering background batch ${batchNumber}:`, err);
          });

          // Petit délai entre les batches
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`❌ Error queuing background batch ${batchNumber} for dataset ${datasetId}:`, error);
        }
      }
      
      // Délai entre les datasets
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('✅ Background processing initiated for all batches with specialized workers');
  };

  // Lancer le traitement en arrière-plan
  if ((globalThis as any).EdgeRuntime?.waitUntil) {
    (globalThis as any).EdgeRuntime.waitUntil(backgroundProcessing());
  } else {
    // Fallback si EdgeRuntime n'est pas disponible
    backgroundProcessing().catch(console.error);
  }

  // Traiter quelques batches en mode synchrone pour la réponse immédiate
  const IMMEDIATE_BATCHES = Math.min(2, Math.ceil(allPendingPosts.length / MEGA_BATCH_SIZE));
  
  for (let i = 0; i < IMMEDIATE_BATCHES * MEGA_BATCH_SIZE && i < allPendingPosts.length; i += MEGA_BATCH_SIZE) {
    const batch = allPendingPosts.slice(i, i + MEGA_BATCH_SIZE);
    const batchNumber = Math.floor(i / MEGA_BATCH_SIZE) + 1;
    
    console.log(`🚀 Processing IMMEDIATE batch ${batchNumber}/${IMMEDIATE_BATCHES} (${batch.length} posts)`);
    
    try {
      // ✅ AMÉLIORATION : Utiliser le worker Step 1 spécialisé avec attente de réponse
      console.log(`📤 Invoking openai-step1-worker for immediate batch ${batchNumber}...`);
      const response = await supabaseClient.functions.invoke('openai-step1-worker', {
        body: { 
          post_ids: batch.map(p => p.id),
          dataset_id: batch[0]?.apify_dataset_id,
          batch_mode: true,
          timeout_protection: true
        }
      });

      console.log(`✅ Immediate batch ${batchNumber} response:`, response.data || response);
      queuedCount += batch.length;
      
    } catch (error) {
      console.error(`❌ Error queuing immediate batch ${batchNumber}:`, error);
    }
  }

  console.log(`✅ HYBRID queuing: ${queuedCount} posts queued immediately, ${allPendingPosts.length - queuedCount} in background`);
  
  return new Response(JSON.stringify({ 
    success: true, 
    queued_count: queuedCount,
    total_pending: allPendingPosts.length,
    immediate_batches: IMMEDIATE_BATCHES,
    background_batches: Math.ceil(allPendingPosts.length / MEGA_BATCH_SIZE) - IMMEDIATE_BATCHES,
    timeout_protection: timeoutProtection,
    hybrid_processing: true,
    using_specialized_workers: true,
    datasets_processed: Object.keys(allPendingPosts.reduce((acc, post) => {
      acc[post.apify_dataset_id] = true;
      return acc;
    }, {} as Record<string, boolean>)).length
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function processNextBatch(supabaseClient: any, taskType: string) {
  console.log(`🔄 Processing next OPTIMIZED batch for task type: ${taskType}`);
  
  const batchSize = getOptimizedBatchSizeForTaskType(taskType);
  
  // Logique de traitement par batch selon le type de tâche
  let query = supabaseClient.from('linkedin_posts').select('*');
  
  switch (taskType) {
    case 'openai_step2':
      query = query.eq('openai_step1_recrute_poste', 'oui')
                  .is('openai_step2_reponse', null)
                  .eq('processing_status', 'processing');
      break;
    case 'openai_step3':
      query = query.eq('openai_step2_reponse', 'oui')
                  .is('openai_step3_categorie', null)
                  .eq('processing_status', 'processing');
      break;
    case 'unipile_scraping':
      query = query.eq('openai_step2_reponse', 'oui')
                  .eq('unipile_profile_scraped', false)
                  .eq('processing_status', 'processing');
      break;
    case 'lead_creation':
      query = query.eq('unipile_profile_scraped', true)
                  .is('lead_id', null)
                  .eq('processing_status', 'processing');
      break;
  }
  
  const { data: posts, error } = await query
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (error) {
    throw new Error(`Error fetching posts for ${taskType}: ${error.message}`);
  }

  console.log(`📊 Found ${posts.length} posts to process for ${taskType}`);

  // Déclencher le traitement approprié
  let processedCount = 0;
  
  if (taskType.startsWith('openai_')) {
    // Mode méga-batch pour OpenAI
    if (posts.length > 0) {
      const step = taskType.replace('openai_', '');
      try {
        await supabaseClient.functions.invoke('specialized-openai-worker', {
          body: { 
            post_ids: posts.map(p => p.id),
            dataset_id: posts[0]?.apify_dataset_id,
            step: step,
            batch_mode: true,
            mega_batch: true
          }
        });
        processedCount = posts.length;
      } catch (error) {
        console.error(`❌ Error processing OpenAI mega batch for ${taskType}:`, error);
      }
    }
  } else {
    // Mode optimisé pour Unipile et Lead creation
    const PARALLEL_LIMIT = 5; // Traitement en parallèle limité
    
    for (let i = 0; i < posts.length; i += PARALLEL_LIMIT) {
      const chunk = posts.slice(i, i + PARALLEL_LIMIT);
      
      await Promise.all(chunk.map(async (post) => {
        try {
          await triggerSpecializedWorker(supabaseClient, taskType, post);
          processedCount++;
        } catch (error) {
          console.error(`❌ Error processing post ${post.id} for ${taskType}:`, error);
        }
      }));
    }
  }

  return new Response(JSON.stringify({ 
    success: true, 
    task_type: taskType,
    processed_count: processedCount,
    total_found: posts.length
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function requeueFailedPosts(supabaseClient: any, datasetId?: string) {
  console.log('🔄 Requeuing failed posts with OPTIMIZED strategy...');
  
  let query = supabaseClient
    .from('linkedin_posts')
    .select('*')
    .in('processing_status', ['error', 'failed_max_retries'])
    .lt('retry_count', 3); // Réduit de 5 à 3 pour éviter les posts défaillants

  if (datasetId) {
    query = query.eq('apify_dataset_id', datasetId);
  }

  const { data: failedPosts, error } = await query.limit(200); // Augmenté de 100 à 200

  if (error) {
    throw new Error(`Error fetching failed posts: ${error.message}`);
  }

  // Traitement par batch de 50 pour la requeue
  const REQUEUE_BATCH = 50;
  let requeuedCount = 0;

  for (let i = 0; i < failedPosts.length; i += REQUEUE_BATCH) {
    const batch = failedPosts.slice(i, i + REQUEUE_BATCH);
    
    try {
      const updates = batch.map(post => ({
        id: post.id,
        processing_status: 'pending',
        retry_count: (post.retry_count || 0) + 1,
        last_retry_at: new Date().toISOString()
      }));

      await supabaseClient
        .from('linkedin_posts')
        .upsert(updates);

      requeuedCount += batch.length;
    } catch (error) {
      console.error(`❌ Error requeuing batch:`, error);
    }
  }

  return new Response(JSON.stringify({ 
    success: true, 
    requeued_count: requeuedCount,
    dataset_id: datasetId
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function forceReprocessPost(supabaseClient: any, postId: string) {
  console.log(`🔄 Force reprocessing post: ${postId}`);
  
  await supabaseClient
    .from('linkedin_posts')
    .update({
      processing_status: 'pending',
      retry_count: 0,
      openai_step1_recrute_poste: null,
      openai_step2_reponse: null,
      openai_step3_categorie: null,
      unipile_profile_scraped: false,
      approach_message_generated: false,
      lead_id: null,
      last_retry_at: new Date().toISOString()
    })
    .eq('id', postId);

  return new Response(JSON.stringify({ 
    success: true, 
    message: `Post ${postId} queued for reprocessing`
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function triggerSpecializedWorker(supabaseClient: any, taskType: string, post: any) {
  const workerMap = {
    'unipile_scraping': 'specialized-unipile-worker', 
    'lead_creation': 'specialized-lead-worker'
  };

  const workerName = workerMap[taskType as keyof typeof workerMap];
  if (!workerName) {
    throw new Error(`Unknown task type: ${taskType}`);
  }

  await supabaseClient.functions.invoke(workerName, {
    body: { 
      post_id: post.id, 
      dataset_id: post.apify_dataset_id,
      task_type: taskType
    }
  });
}

function getOptimizedBatchSizeForTaskType(taskType: string): number {
  const batchSizes = {
    'openai_step2': 100,     // Augmenté de 30 à 100
    'openai_step3': 100,     // Augmenté de 30 à 100
    'unipile_scraping': 25,  // Augmenté de 10 à 25
    'lead_creation': 100     // Augmenté de 50 à 100
  };
  
  return batchSizes[taskType as keyof typeof batchSizes] || 50;
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎯 Processing Queue Manager started - ENHANCED VERSION');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      action, 
      task_type, 
      post_id, 
      dataset_id, 
      force_reprocess = false, 
      timeout_protection = false,
      apify_api_key,
      force_all = false 
    } = await req.json();

    switch (action) {
      case 'fast_webhook_processing':
        return await fastWebhookProcessing(supabaseClient, dataset_id, apify_api_key, force_all);
      case 'queue_posts':
        return await queuePendingPosts(supabaseClient, timeout_protection, dataset_id);
      case 'process_next_batch':
        return await processNextBatch(supabaseClient, task_type, dataset_id);
      case 'requeue_failed':
        return await requeueFailedPosts(supabaseClient, dataset_id);
      case 'force_reprocess':
        return await forceReprocessPost(supabaseClient, post_id);
      case 'full_workflow_orchestration':
        return await fullWorkflowOrchestration(supabaseClient, dataset_id);
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

async function fastWebhookProcessing(supabaseClient, datasetId, apifyApiKey, forceAll) {
  console.log('⚡ FAST WEBHOOK PROCESSING: Starting optimized background task');
  
  const backgroundTask = async () => {
    try {
      console.log('🔄 Background task: Starting optimized dataset processing...');
      
      // ✅ OPTIMISATION : Collecte plus rapide avec moins de batches
      const limit = 2000; // Augmenté pour réduire les appels API
      let offset = 0;
      let allItems = [];
      let batchCount = 0;
      
      // Limite de sécurité pour éviter les timeouts
      const MAX_BATCHES = 50;
      
      while (batchCount < MAX_BATCHES) {
        batchCount++;
        console.log(`📥 Background: Fetching optimized batch ${batchCount}`);
        
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
        
        // Pause réduite pour optimiser
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      console.log(`📊 Background: Collected ${allItems.length} items in ${batchCount} batches`);
      
      // ✅ OPTIMISATION : Stockage par batches plus grands
      const validRawData = allItems.filter(item => item && item.urn)
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
      
      // ✅ OPTIMISATION : Stockage par batches de 1000 (plus efficace)
      const BATCH_SIZE = 1000;
      for (let i = 0; i < validRawData.length; i += BATCH_SIZE) {
        const batch = validRawData.slice(i, i + BATCH_SIZE);
        await supabaseClient
          .from('linkedin_posts_raw')
          .upsert(batch, { onConflict: 'urn', ignoreDuplicates: false });
        
        console.log(`💾 Background: Stored optimized batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(validRawData.length/BATCH_SIZE)}`);
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      
      // ✅ OPTIMISATION : Classification plus rapide
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
      
      // ✅ OPTIMISATION : Insertion par batches plus grands
      const insertedPosts = [];
      for (let i = 0; i < qualifiedPosts.length; i += BATCH_SIZE) {
        const batch = qualifiedPosts.slice(i, i + BATCH_SIZE);
        const { data: insertedBatch, error } = await supabaseClient
          .from('linkedin_posts')
          .upsert(batch, { onConflict: 'urn', ignoreDuplicates: true })
          .select('id');
        
        if (insertedBatch) {
          insertedPosts.push(...insertedBatch);
        }
        
        console.log(`🚀 Background: Queued optimized batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(qualifiedPosts.length/BATCH_SIZE)}`);
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      
      console.log(`✅ Background task completed: ${insertedPosts.length} posts queued`);
      
      // ✅ CORRECTION CRITIQUE : Déclenchement optimisé des workers
      if (insertedPosts.length > 0) {
        console.log('🚀 Triggering optimized OpenAI Step 1 workers...');
        
        // Attendre plus longtemps pour s'assurer de la cohérence
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // ✅ OPTIMISATION : Récupération optimisée
        const { data: pendingPosts, error: fetchError } = await supabaseClient
          .from('linkedin_posts')
          .select('id')
          .eq('apify_dataset_id', datasetId)
          .eq('processing_status', 'pending')
          .order('created_at', { ascending: true })
          .limit(2000); // Limite pour éviter les timeouts
        
        if (fetchError) {
          console.error('❌ Error fetching pending posts:', fetchError);
          return;
        }
        
        if (!pendingPosts || pendingPosts.length === 0) {
          console.log('ℹ️ No pending posts found for dataset:', datasetId);
          return;
        }
        
        console.log(`📋 Found ${pendingPosts.length} pending posts to process`);
        
        // ✅ OPTIMISATION : Batches plus grands pour les workers
        const WORKER_BATCH_SIZE = 100; // Augmenté pour plus d'efficacité
        const realPostIds = pendingPosts.map(p => p.id).filter(id => id);
        
        // ✅ LIMITE DE SÉCURITÉ : Traiter par chunks pour éviter les timeouts
        const MAX_WORKER_BATCHES = 20;
        const totalBatches = Math.min(MAX_WORKER_BATCHES, Math.ceil(realPostIds.length / WORKER_BATCH_SIZE));
        
        for (let i = 0; i < totalBatches * WORKER_BATCH_SIZE && i < realPostIds.length; i += WORKER_BATCH_SIZE) {
          const batchIds = realPostIds.slice(i, i + WORKER_BATCH_SIZE);
          const batchNumber = Math.floor(i / WORKER_BATCH_SIZE) + 1;
          
          try {
            console.log(`📤 Invoking optimized openai-step1-worker for batch ${batchNumber}/${totalBatches} (${batchIds.length} posts)`);
            
            // ✅ VALIDATION RENFORCÉE
            const validIds = batchIds.filter(id => {
              if (!id || typeof id !== 'string') return false;
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              return uuidRegex.test(id);
            });
            
            if (validIds.length === 0) {
              console.error(`❌ No valid post IDs in batch ${batchNumber}`);
              continue;
            }
            
            console.log(`🔍 Processing ${validIds.length} valid IDs in batch: ${validIds.slice(0, 3).join(', ')}${validIds.length > 3 ? '...' : ''}`);
            
            const workerResponse = await supabaseClient.functions.invoke('openai-step1-worker', {
              body: {
                post_ids: validIds,
                dataset_id: datasetId,
                batch_mode: true,
                timeout_protection: true,
                workflow_enabled: true
              }
            });
            
            console.log(`✅ OpenAI Step 1 worker batch ${batchNumber} triggered:`, workerResponse.data?.success ? 'SUCCESS' : 'PENDING');
            
            // ✅ OPTIMISATION : Pause plus courte entre les batches
            if (i + WORKER_BATCH_SIZE < totalBatches * WORKER_BATCH_SIZE) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
          } catch (error) {
            console.error(`❌ Error triggering OpenAI Step 1 worker batch ${batchNumber}:`, error);
          }
        }
        
        console.log(`✅ All optimized OpenAI Step 1 batches triggered for ${Math.min(realPostIds.length, totalBatches * WORKER_BATCH_SIZE)} posts`);
      }
      
    } catch (error) {
      console.error('❌ Background task error:', error);
    }
  };
  
  // ✅ DÉMARRAGE OPTIMISÉ : Toujours en arrière-plan pour éviter les timeouts
  if (globalThis.EdgeRuntime?.waitUntil) {
    globalThis.EdgeRuntime.waitUntil(backgroundTask());
  } else {
    backgroundTask().catch(console.error);
  }
  
  return new Response(JSON.stringify({
    success: true,
    message: 'Optimized fast webhook processing started in background',
    dataset_id: datasetId
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function queuePendingPosts(supabaseClient, timeoutProtection = false, datasetId) {
  console.log('📥 Starting OPTIMIZED queuing of pending posts...');
  
  let allPendingPosts = [];
  let page = 0;
  const PAGE_SIZE = 1000;
  
  while (true) {
    let query = supabaseClient
      .from('linkedin_posts')
      .select('*')
      .eq('processing_status', 'pending')
      .order('created_at', { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    
    if (datasetId && datasetId !== 'null' && datasetId !== null) {
      query = query.eq('apify_dataset_id', datasetId);
    }
    
    const { data: pendingPostsPage, error } = await query;
    
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
  
  console.log(`📊 Found ${allPendingPosts.length} TOTAL pending posts for dataset: ${datasetId || 'ALL'}`);
  
  if (allPendingPosts.length === 0) {
    return new Response(JSON.stringify({
      success: true,
      queued_count: 0,
      total_pending: 0,
      message: 'No pending posts found',
      dataset_id: datasetId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  const MEGA_BATCH_SIZE = timeoutProtection ? 50 : 100;
  let queuedCount = 0;
  
  const backgroundProcessing = async () => {
    console.log('🚀 Starting BACKGROUND processing with specialized Step 1 workers...');
    
    const postsByDataset = allPendingPosts.reduce((acc, post) => {
      const datasetId = post.apify_dataset_id;
      if (!acc[datasetId]) {
        acc[datasetId] = [];
      }
      acc[datasetId].push(post);
      return acc;
    }, {});
    
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
          console.log(`📤 Invoking openai-step1-worker for batch ${batchNumber}...`);
          
          const validPostIds = batch.map(p => p.id).filter(id => {
            if (!id || typeof id !== 'string') return false;
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            return uuidRegex.test(id);
          });
          
          if (validPostIds.length === 0) {
            console.error(`❌ No valid post IDs in batch ${batchNumber}`);
            continue;
          }
          
          console.log(`📋 Valid post IDs in batch: ${validPostIds.slice(0, 5).join(', ')}${validPostIds.length > 5 ? '...' : ''}`);
          
          const workerPromise = supabaseClient.functions.invoke('openai-step1-worker', {
            body: {
              post_ids: validPostIds,
              dataset_id: datasetId || null,
              batch_mode: true,
              timeout_protection: timeoutProtection,
              workflow_enabled: true
            }
          });
          
          workerPromise
            .then(response => {
              console.log(`✅ Worker Step 1 response for batch ${batchNumber}:`, response.data || response);
            })
            .catch(err => {
              console.error(`⚠️ Error triggering background batch ${batchNumber}:`, err);
            });
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`❌ Error queuing background batch ${batchNumber} for dataset ${datasetId}:`, error);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('✅ Background processing initiated for all batches with specialized workers');
  };
  
  if (globalThis.EdgeRuntime?.waitUntil) {
    globalThis.EdgeRuntime.waitUntil(backgroundProcessing());
  } else {
    backgroundProcessing().catch(console.error);
  }
  
  const IMMEDIATE_BATCHES = Math.min(2, Math.ceil(allPendingPosts.length / MEGA_BATCH_SIZE));
  
  for (let i = 0; i < IMMEDIATE_BATCHES * MEGA_BATCH_SIZE && i < allPendingPosts.length; i += MEGA_BATCH_SIZE) {
    const batch = allPendingPosts.slice(i, i + MEGA_BATCH_SIZE);
    const batchNumber = Math.floor(i / MEGA_BATCH_SIZE) + 1;
    
    console.log(`🚀 Processing IMMEDIATE batch ${batchNumber}/${IMMEDIATE_BATCHES} (${batch.length} posts)`);
    
    try {
      console.log(`📤 Invoking openai-step1-worker for immediate batch ${batchNumber}...`);
      
      const validPostIds = batch.map(p => p.id).filter(id => {
        if (!id || typeof id !== 'string') return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
      });
      
      if (validPostIds.length === 0) {
        console.error(`❌ No valid post IDs in immediate batch ${batchNumber}`);
        continue;
      }
      
      const response = await supabaseClient.functions.invoke('openai-step1-worker', {
        body: {
          post_ids: validPostIds,
          dataset_id: batch[0]?.apify_dataset_id || null,
          batch_mode: true,
          timeout_protection: true,
          workflow_enabled: true
        }
      });
      
      console.log(`✅ Immediate batch ${batchNumber} response:`, response.data || response);
      queuedCount += validPostIds.length;
      
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
    dataset_id: datasetId,
    datasets_processed: Object.keys(allPendingPosts.reduce((acc, post) => {
      acc[post.apify_dataset_id] = true;
      return acc;
    }, {})).length
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function processNextBatch(supabaseClient, taskType, datasetId) {
  console.log(`🔄 Processing next OPTIMIZED batch for task type: ${taskType}, dataset: ${datasetId}`);
  
  const batchSize = getOptimizedBatchSizeForTaskType(taskType);
  
  let query = supabaseClient.from('linkedin_posts').select('*');
  
  if (datasetId && datasetId !== 'null' && datasetId !== null) {
    query = query.eq('apify_dataset_id', datasetId);
  }
  
  switch (taskType) {
    case 'openai_step2':
      query = query.eq('openai_step1_recrute_poste', 'oui').is('openai_step2_reponse', null).eq('processing_status', 'processing');
      break;
    case 'openai_step3':
      query = query.eq('openai_step2_reponse', 'oui').is('openai_step3_categorie', null).eq('processing_status', 'processing');
      break;
    case 'unipile_scraping':
      query = query.eq('openai_step2_reponse', 'oui').eq('unipile_profile_scraped', false).eq('processing_status', 'processing');
      break;
    case 'company_verification':
      query = query.eq('unipile_profile_scraped', true).is('company_verified_at', null).eq('processing_status', 'processing');
      break;
    case 'lead_creation':
      query = query.eq('unipile_profile_scraped', true).is('lead_id', null).eq('processing_status', 'processing');
      break;
  }
  
  const { data: posts, error } = await query.order('created_at', { ascending: true }).limit(batchSize);
  
  if (error) {
    throw new Error(`Error fetching posts for ${taskType}: ${error.message}`);
  }
  
  console.log(`📊 Found ${posts.length} posts to process for ${taskType} in dataset ${datasetId || 'ALL'}`);
  
  let processedCount = 0;
  
  if (taskType.startsWith('openai_')) {
    if (posts.length > 0) {
      const step = taskType.replace('openai_', '');
      try {
        const workerName = `openai-${step}-worker`;
        console.log(`📤 Invoking ${workerName} for ${posts.length} posts`);
        
        await supabaseClient.functions.invoke(workerName, {
          body: {
            post_ids: posts.map(p => p.id),
            dataset_id: posts[0]?.apify_dataset_id || null,
            batch_mode: true,
            mega_batch: true,
            workflow_enabled: true
          }
        });
        
        processedCount = posts.length;
      } catch (error) {
        console.error(`❌ Error processing OpenAI batch for ${taskType}:`, error);
      }
    }
  } else {
    const PARALLEL_LIMIT = 5;
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
    total_found: posts.length,
    dataset_id: datasetId
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function requeueFailedPosts(supabaseClient, datasetId) {
  console.log('🔄 Requeuing failed posts with OPTIMIZED strategy...');
  
  let query = supabaseClient
    .from('linkedin_posts')
    .select('*')
    .in('processing_status', ['error', 'failed_max_retries'])
    .lt('retry_count', 3);
  
  if (datasetId && datasetId !== 'null' && datasetId !== null) {
    query = query.eq('apify_dataset_id', datasetId);
  }
  
  const { data: failedPosts, error } = await query.limit(200);
  
  if (error) {
    throw new Error(`Error fetching failed posts: ${error.message}`);
  }
  
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
      
      await supabaseClient.from('linkedin_posts').upsert(updates);
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

async function forceReprocessPost(supabaseClient, postId) {
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

async function triggerSpecializedWorker(supabaseClient, taskType, post) {
  const workerMap = {
    'unipile_scraping': 'specialized-unipile-worker',
    'company_verification': 'specialized-company-worker',
    'lead_creation': 'specialized-lead-worker'
  };
  
  const workerName = workerMap[taskType];
  if (!workerName) {
    throw new Error(`Unknown task type: ${taskType}`);
  }
  
  await supabaseClient.functions.invoke(workerName, {
    body: {
      post_id: post.id,
      dataset_id: post.apify_dataset_id || null,
      task_type: taskType,
      workflow_trigger: true
    }
  });
}

function getOptimizedBatchSizeForTaskType(taskType) {
  const batchSizes = {
    'openai_step2': 100,
    'openai_step3': 100,
    'unipile_scraping': 25,
    'company_verification': 50,
    'lead_creation': 100
  };
  return batchSizes[taskType] || 50;
}

async function fullWorkflowOrchestration(supabaseClient, datasetId) {
  console.log(`🎯 Starting full workflow orchestration for dataset: ${datasetId}`);
  
  const results = {
    started_at: new Date().toISOString(),
    dataset_id: datasetId,
    steps: []
  };
  
  try {
    console.log('📥 Step 1: Queuing pending posts...');
    const queueResult = await queuePendingPosts(supabaseClient, true, datasetId);
    results.steps.push({
      step: 'queue_posts',
      success: true,
      timestamp: new Date().toISOString()
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('🌍 Step 2: Processing OpenAI Step 2...');
    await processNextBatch(supabaseClient, 'openai_step2', datasetId);
    results.steps.push({
      step: 'openai_step2',
      success: true,
      timestamp: new Date().toISOString()
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🏷️ Step 3: Processing OpenAI Step 3...');
    await processNextBatch(supabaseClient, 'openai_step3', datasetId);
    results.steps.push({
      step: 'openai_step3',
      success: true,
      timestamp: new Date().toISOString()
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🔍 Step 4: Processing Unipile scraping...');
    await processNextBatch(supabaseClient, 'unipile_scraping', datasetId);
    results.steps.push({
      step: 'unipile_scraping',
      success: true,
      timestamp: new Date().toISOString()
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🏢 Step 5: Processing company verification...');
    await processNextBatch(supabaseClient, 'company_verification', datasetId);
    results.steps.push({
      step: 'company_verification',
      success: true,
      timestamp: new Date().toISOString()
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('👤 Step 6: Processing lead creation...');
    await processNextBatch(supabaseClient, 'lead_creation', datasetId);
    results.steps.push({
      step: 'lead_creation',
      success: true,
      timestamp: new Date().toISOString()
    });
    
    results.completed_at = new Date().toISOString();
    
    return new Response(JSON.stringify({
      success: true,
      action: 'full_workflow_orchestration',
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error in full workflow orchestration:', error);
    results.error = error.message;
    results.failed_at = new Date().toISOString();
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      results
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

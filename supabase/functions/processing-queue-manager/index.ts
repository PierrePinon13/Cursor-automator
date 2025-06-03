
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

    const { action, task_type, post_id, dataset_id, force_reprocess = false } = await req.json();

    switch (action) {
      case 'queue_posts':
        return await queuePendingPosts(supabaseClient);
      
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

async function queuePendingPosts(supabaseClient: any) {
  console.log('📥 Queuing pending posts for processing...');
  
  const { data: pendingPosts, error } = await supabaseClient
    .from('linkedin_posts')
    .select('*')
    .eq('processing_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(500); // Augmenter la limite

  if (error) {
    throw new Error(`Error fetching pending posts: ${error.message}`);
  }

  console.log(`📊 Found ${pendingPosts.length} pending posts`);

  // Traitement par batch plus important pour OpenAI Step 1
  const OPENAI_BATCH_SIZE = 30; // Augmenté de 10 à 30
  let queuedCount = 0;
  
  // Traiter par batch de 30 pour l'étape 1
  for (let i = 0; i < pendingPosts.length; i += OPENAI_BATCH_SIZE) {
    const batch = pendingPosts.slice(i, i + OPENAI_BATCH_SIZE);
    const batchNumber = Math.floor(i / OPENAI_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(pendingPosts.length / OPENAI_BATCH_SIZE);
    
    console.log(`🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} posts)`);
    
    try {
      // Déclencher le traitement en mode batch
      supabaseClient.functions.invoke('specialized-openai-worker', {
        body: { 
          post_ids: batch.map(p => p.id),
          dataset_id: batch[0]?.apify_dataset_id,
          step: 'step1',
          batch_mode: true
        }
      }).catch((err: any) => {
        console.error(`⚠️ Error triggering OpenAI batch ${batchNumber}:`, err);
      });

      queuedCount += batch.length;
      
      // Pause courte entre les batches
      if (i + OPENAI_BATCH_SIZE < pendingPosts.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
    } catch (error) {
      console.error(`❌ Error queuing batch ${batchNumber}:`, error);
    }
  }

  console.log(`✅ Queued ${queuedCount} posts for processing in ${Math.ceil(pendingPosts.length / OPENAI_BATCH_SIZE)} batches`);
  
  return new Response(JSON.stringify({ 
    success: true, 
    queued_count: queuedCount,
    total_pending: pendingPosts.length,
    batch_count: Math.ceil(pendingPosts.length / OPENAI_BATCH_SIZE)
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function processNextBatch(supabaseClient: any, taskType: string) {
  console.log(`🔄 Processing next batch for task type: ${taskType}`);
  
  const batchSize = getBatchSizeForTaskType(taskType);
  
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
    // Mode batch pour OpenAI
    if (posts.length > 0) {
      const step = taskType.replace('openai_', '');
      try {
        await supabaseClient.functions.invoke('specialized-openai-worker', {
          body: { 
            post_ids: posts.map(p => p.id),
            dataset_id: posts[0]?.apify_dataset_id,
            step: step,
            batch_mode: true
          }
        });
        processedCount = posts.length;
      } catch (error) {
        console.error(`❌ Error processing OpenAI batch for ${taskType}:`, error);
      }
    }
  } else {
    // Mode individuel pour Unipile et Lead creation
    for (const post of posts) {
      try {
        await triggerSpecializedWorker(supabaseClient, taskType, post);
        processedCount++;
      } catch (error) {
        console.error(`❌ Error processing post ${post.id} for ${taskType}:`, error);
      }
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
  console.log('🔄 Requeuing failed posts...');
  
  let query = supabaseClient
    .from('linkedin_posts')
    .select('*')
    .in('processing_status', ['error', 'failed_max_retries'])
    .lt('retry_count', 5);

  if (datasetId) {
    query = query.eq('apify_dataset_id', datasetId);
  }

  const { data: failedPosts, error } = await query.limit(100); // Augmenté de 50 à 100

  if (error) {
    throw new Error(`Error fetching failed posts: ${error.message}`);
  }

  let requeuedCount = 0;
  for (const post of failedPosts) {
    try {
      await supabaseClient
        .from('linkedin_posts')
        .update({ 
          processing_status: 'pending',
          retry_count: (post.retry_count || 0) + 1,
          last_retry_at: new Date().toISOString()
        })
        .eq('id', post.id);

      requeuedCount++;
    } catch (error) {
      console.error(`❌ Error requeuing post ${post.id}:`, error);
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

function getBatchSizeForTaskType(taskType: string): number {
  const batchSizes = {
    'openai_step2': 30,      // Augmenté de 10 à 30
    'openai_step3': 30,      // Augmenté de 10 à 30  
    'unipile_scraping': 10,  // Augmenté de 5 à 10
    'lead_creation': 50      // Augmenté de 20 à 50
  };
  
  return batchSizes[taskType as keyof typeof batchSizes] || 20;
}

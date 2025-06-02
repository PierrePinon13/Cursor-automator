
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Types pour les tâches de traitement
interface ProcessingTask {
  id: string;
  type: 'openai_analysis' | 'unipile_scraping' | 'lead_creation' | 'requalification';
  data: any;
  retry_count: number;
  next_retry_at?: string;
  dataset_id: string;
}

// Configuration des retry selon le type d'erreur
const RETRY_CONFIG = {
  openai_rate_limit: { delay: 60000, max_retries: 5 },
  openai_timeout: { delay: 30000, max_retries: 3 },
  unipile_rate_limit: { delay: 120000, max_retries: 10 },
  unipile_provider_error: { delay: 300000, max_retries: 5 },
  temporary_error: { delay: 60000, max_retries: 3 },
  permanent_error: { delay: 0, max_retries: 0 }
};

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
  
  // ✅ CORRECTION: Utiliser 'pending' au lieu de 'queued'
  const { data: pendingPosts, error } = await supabaseClient
    .from('linkedin_posts')
    .select('*')
    .eq('processing_status', 'pending')
    .order('created_at', { ascending: true }) // Ordre par date de création
    .limit(100);

  if (error) {
    throw new Error(`Error fetching pending posts: ${error.message}`);
  }

  let queuedCount = 0;
  
  for (const post of pendingPosts) {
    try {
      // Déclencher le traitement de façon asynchrone
      supabaseClient.functions.invoke('specialized-openai-worker', {
        body: { 
          post_id: post.id, 
          dataset_id: post.apify_dataset_id,
          step: 'step1'
        }
      }).catch((err: any) => {
        console.error(`⚠️ Error triggering OpenAI worker for post ${post.id}:`, err);
      });

      queuedCount++;
    } catch (error) {
      console.error(`❌ Error queuing post ${post.id}:`, error);
    }
  }

  console.log(`✅ Queued ${queuedCount} posts for processing`);
  
  return new Response(JSON.stringify({ 
    success: true, 
    queued_count: queuedCount,
    total_pending: pendingPosts.length
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
    case 'openai_analysis':
      query = query.eq('processing_status', 'processing')
                  .is('openai_step1_recrute_poste', null);
      break;
    case 'unipile_scraping':
      query = query.eq('processing_status', 'processing')
                  .eq('openai_step2_reponse', 'oui')
                  .eq('unipile_profile_scraped', false);
      break;
    case 'lead_creation':
      query = query.eq('processing_status', 'processing')
                  .eq('unipile_profile_scraped', true)
                  .is('lead_id', null);
      break;
  }
  
  const { data: posts, error } = await query
    .order('created_at', { ascending: true }) // Remplacé processing_priority par created_at
    .limit(batchSize);

  if (error) {
    throw new Error(`Error fetching posts for ${taskType}: ${error.message}`);
  }

  // Déclencher le traitement des posts trouvés
  let processedCount = 0;
  for (const post of posts) {
    try {
      await triggerSpecializedWorker(supabaseClient, taskType, post);
      processedCount++;
    } catch (error) {
      console.error(`❌ Error processing post ${post.id} for ${taskType}:`, error);
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
    .lt('retry_count', 5); // Limiter les retry infinis

  if (datasetId) {
    query = query.eq('apify_dataset_id', datasetId);
  }

  const { data: failedPosts, error } = await query.limit(50);

  if (error) {
    throw new Error(`Error fetching failed posts: ${error.message}`);
  }

  let requeuedCount = 0;
  for (const post of failedPosts) {
    try {
      // ✅ CORRECTION: Utiliser 'pending' au lieu de 'queued'
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
  
  // ✅ CORRECTION: Utiliser 'pending' au lieu de 'queued'
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
    'openai_analysis': 'specialized-openai-worker',
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
    'openai_analysis': 10,
    'unipile_scraping': 5, // Plus conservateur pour Unipile
    'lead_creation': 20
  };
  
  return batchSizes[taskType as keyof typeof batchSizes] || 10;
}

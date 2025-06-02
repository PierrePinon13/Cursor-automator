
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
    console.log('🎯 Master Orchestrator started');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      action = 'full_cycle',
      dataset_id,
      worker_type,
      batch_size = 10,
      parallel_workers = 3
    } = await req.json();

    switch (action) {
      case 'full_cycle':
        return await runFullProcessingCycle(supabaseClient, dataset_id);
      
      case 'worker_batch':
        return await runWorkerBatch(supabaseClient, worker_type, batch_size, dataset_id);
      
      case 'health_check':
        return await runHealthCheck(supabaseClient);
      
      case 'recovery_mode':
        return await runRecoveryMode(supabaseClient, dataset_id);
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error('❌ Error in master-orchestrator:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function runFullProcessingCycle(supabaseClient: any, datasetId?: string) {
  console.log('🔄 Running full processing cycle...');

  const results = {
    cycle_started_at: new Date().toISOString(),
    dataset_id: datasetId,
    steps: []
  };

  try {
    // Étape 1: Queue management
    console.log('📥 Step 1: Queue management');
    const queueResult = await supabaseClient.functions.invoke('processing-queue-manager', {
      body: { action: 'queue_posts' }
    });
    results.steps.push({ step: 'queue_management', result: queueResult.data, success: !queueResult.error });

    // Attendre un peu entre les étapes
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Étape 2: OpenAI batch processing
    console.log('🤖 Step 2: OpenAI batch processing');
    const openaiResult = await supabaseClient.functions.invoke('processing-queue-manager', {
      body: { action: 'process_next_batch', task_type: 'openai_analysis' }
    });
    results.steps.push({ step: 'openai_processing', result: openaiResult.data, success: !openaiResult.error });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Étape 3: Unipile batch scraping
    console.log('🔍 Step 3: Unipile batch scraping');
    const unipileResult = await supabaseClient.functions.invoke('specialized-unipile-worker', {
      body: { batch_mode: true, dataset_id: datasetId }
    });
    results.steps.push({ step: 'unipile_scraping', result: unipileResult.data, success: !unipileResult.error });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Étape 4: Lead creation batch
    console.log('👤 Step 4: Lead creation batch');
    const leadResult = await supabaseClient.functions.invoke('specialized-lead-worker', {
      body: { batch_mode: true, dataset_id: datasetId }
    });
    results.steps.push({ step: 'lead_creation', result: leadResult.data, success: !leadResult.error });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Étape 5: Requalification intelligente
    console.log('🧠 Step 5: Smart requalification');
    const requalResult = await supabaseClient.functions.invoke('requalification-system', {
      body: { action: 'smart_requalification', dataset_id: datasetId }
    });
    results.steps.push({ step: 'requalification', result: requalResult.data, success: !requalResult.error });

    // Statistiques finales
    const stats = await getProcessingStatistics(supabaseClient, datasetId);
    results.final_stats = stats;
    results.cycle_completed_at = new Date().toISOString();

    console.log('✅ Full processing cycle completed');

    return new Response(JSON.stringify({
      success: true,
      action: 'full_cycle',
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in full processing cycle:', error);
    results.error = error.message;
    results.cycle_failed_at = new Date().toISOString();

    return new Response(JSON.stringify({
      success: false,
      action: 'full_cycle',
      results
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function runWorkerBatch(supabaseClient: any, workerType: string, batchSize: number, datasetId?: string) {
  console.log(`🔧 Running ${workerType} worker batch (size: ${batchSize})`);

  const workerMap = {
    'openai': 'processing-queue-manager',
    'unipile': 'specialized-unipile-worker',
    'lead': 'specialized-lead-worker'
  };

  const functionName = workerMap[workerType as keyof typeof workerMap];
  if (!functionName) {
    throw new Error(`Unknown worker type: ${workerType}`);
  }

  const body = workerType === 'openai' 
    ? { action: 'process_next_batch', task_type: 'openai_analysis' }
    : { batch_mode: true, dataset_id: datasetId };

  const result = await supabaseClient.functions.invoke(functionName, { body });

  return new Response(JSON.stringify({
    success: true,
    worker_type: workerType,
    batch_size: batchSize,
    result: result.data
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function runHealthCheck(supabaseClient: any) {
  console.log('🏥 Running health check...');

  const healthStatus = {
    timestamp: new Date().toISOString(),
    services: {},
    overall_status: 'healthy'
  };

  // Vérifier la queue
  try {
    const { data: queueStats } = await supabaseClient
      .from('linkedin_posts')
      .select('processing_status')
      .in('processing_status', ['queued', 'processing', 'error']);

    const queueCounts = queueStats?.reduce((acc: any, post: any) => {
      acc[post.processing_status] = (acc[post.processing_status] || 0) + 1;
      return acc;
    }, {}) || {};

    healthStatus.services.queue = {
      status: queueCounts.error > 10 ? 'degraded' : 'healthy',
      queued: queueCounts.queued || 0,
      processing: queueCounts.processing || 0,
      errors: queueCounts.error || 0
    };
  } catch (error) {
    healthStatus.services.queue = { status: 'unhealthy', error: error.message };
    healthStatus.overall_status = 'degraded';
  }

  // Vérifier les comptes Unipile
  try {
    const { data: accounts } = await supabaseClient
      .from('profiles')
      .select('unipile_account_id')
      .not('unipile_account_id', 'is', null);

    healthStatus.services.unipile = {
      status: accounts?.length > 0 ? 'healthy' : 'unhealthy',
      available_accounts: accounts?.length || 0
    };

    if (accounts?.length === 0) {
      healthStatus.overall_status = 'degraded';
    }
  } catch (error) {
    healthStatus.services.unipile = { status: 'unhealthy', error: error.message };
    healthStatus.overall_status = 'degraded';
  }

  // Vérifier les dernières activités
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: recentActivity } = await supabaseClient
      .from('linkedin_posts')
      .select('id')
      .gte('last_updated_at', oneHourAgo)
      .limit(1);

    healthStatus.services.activity = {
      status: recentActivity?.length > 0 ? 'healthy' : 'stale',
      recent_activity: recentActivity?.length > 0
    };

    if (recentActivity?.length === 0) {
      healthStatus.overall_status = 'stale';
    }
  } catch (error) {
    healthStatus.services.activity = { status: 'unhealthy', error: error.message };
    healthStatus.overall_status = 'degraded';
  }

  return new Response(JSON.stringify({
    success: true,
    health_status: healthStatus
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function runRecoveryMode(supabaseClient: any, datasetId?: string) {
  console.log('🚨 Running recovery mode...');

  const recoveryActions = [];

  try {
    // 1. Emergency reprocess failed posts
    console.log('🔄 Emergency reprocessing failed posts...');
    const emergencyResult = await supabaseClient.functions.invoke('requalification-system', {
      body: { action: 'emergency_reprocess', dataset_id: datasetId, force_reprocess_all: true }
    });
    recoveryActions.push({ action: 'emergency_reprocess', result: emergencyResult.data });

    // 2. Requalify old posts
    console.log('♻️ Requalifying old posts...');
    const requalifyResult = await supabaseClient.functions.invoke('requalification-system', {
      body: { action: 'requalify_old_posts', age_hours: 48, dataset_id: datasetId }
    });
    recoveryActions.push({ action: 'requalify_old_posts', result: requalifyResult.data });

    // 3. Restart queue processing
    console.log('🔄 Restarting queue processing...');
    const queueResult = await supabaseClient.functions.invoke('processing-queue-manager', {
      body: { action: 'queue_posts' }
    });
    recoveryActions.push({ action: 'restart_queue', result: queueResult.data });

    console.log('✅ Recovery mode completed');

    return new Response(JSON.stringify({
      success: true,
      action: 'recovery_mode',
      recovery_actions: recoveryActions,
      dataset_id: datasetId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in recovery mode:', error);
    
    return new Response(JSON.stringify({
      success: false,
      action: 'recovery_mode',
      error: error.message,
      partial_recovery: recoveryActions
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function getProcessingStatistics(supabaseClient: any, datasetId?: string) {
  let query = supabaseClient
    .from('linkedin_posts')
    .select('processing_status, apify_dataset_id');

  if (datasetId) {
    query = query.eq('apify_dataset_id', datasetId);
  }

  const { data: posts } = await query;

  const stats = posts?.reduce((acc: any, post: any) => {
    const status = post.processing_status;
    acc[status] = (acc[status] || 0) + 1;
    acc.total = (acc.total || 0) + 1;
    return acc;
  }, {}) || {};

  return stats;
}

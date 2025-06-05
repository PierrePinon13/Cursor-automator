
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
    console.log('🎯 Batch Pipeline Orchestrator - Starting');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action = 'start_pipeline', dataset_id } = await req.json();
    
    switch (action) {
      case 'start_pipeline':
        return await startFullPipeline(supabaseClient, dataset_id);
      
      case 'check_status':
        return await checkPipelineStatus(supabaseClient, dataset_id);
      
      case 'continue_pipeline':
        return await continuePipeline(supabaseClient, dataset_id);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('❌ Error in batch-pipeline-orchestrator:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function startFullPipeline(supabaseClient: any, datasetId: string) {
  console.log(`🚀 Starting full batch pipeline for dataset: ${datasetId}`);
  
  // Étape 1: Filtrage et mise en queue
  console.log('📥 Step 1: Filter and Queue Posts');
  
  const { data: filterResult, error: filterError } = await supabaseClient.functions.invoke('filter-and-queue-posts', {
    body: { dataset_id: datasetId, batch_size: 100 }
  });

  if (filterError) {
    console.error('❌ Filter and queue error details:', filterError);
    throw new Error(`Filter and queue failed: ${filterError.message}`);
  }

  if (!filterResult?.success) {
    console.error('❌ Filter and queue returned unsuccessful result:', filterResult);
    throw new Error(`Filter and queue failed: ${filterResult?.error || 'Unknown error'}`);
  }

  console.log('✅ Filter and queue completed successfully:', filterResult);

  return new Response(JSON.stringify({
    success: true,
    action: 'pipeline_started',
    dataset_id: datasetId,
    filter_result: filterResult,
    message: 'Pipeline started with filter and queue step'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function checkPipelineStatus(supabaseClient: any, datasetId: string) {
  console.log(`📊 Checking pipeline status for dataset: ${datasetId}`);
  
  // Compter les posts par statut
  const { data: statusCounts } = await supabaseClient
    .from('linkedin_posts')
    .select('processing_status')
    .eq('apify_dataset_id', datasetId);

  const stats = statusCounts?.reduce((acc: any, post: any) => {
    acc[post.processing_status] = (acc[post.processing_status] || 0) + 1;
    acc.total = (acc.total || 0) + 1;
    return acc;
  }, {}) || {};

  // Déterminer les prochaines étapes possibles
  const nextSteps = [];
  if (stats.queued_step1 > 0) nextSteps.push('openai_step1');
  if (stats.queued_step2 > 0) nextSteps.push('openai_step2');
  if (stats.queued_step3 > 0) nextSteps.push('openai_step3');
  if (stats.queued_unipile > 0) nextSteps.push('unipile');
  if (stats.queued_lead_creation > 0) nextSteps.push('lead_creation');

  return new Response(JSON.stringify({
    success: true,
    dataset_id: datasetId,
    pipeline_status: stats,
    next_steps: nextSteps,
    pipeline_complete: nextSteps.length === 0
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function continuePipeline(supabaseClient: any, datasetId: string) {
  console.log(`⏭️ Continuing pipeline for dataset: ${datasetId}`);
  
  // Vérifier l'état actuel et déclencher les prochaines étapes
  const statusResponse = await checkPipelineStatus(supabaseClient, datasetId);
  const statusData = await statusResponse.json();
  
  const nextSteps = statusData.next_steps || [];
  const triggerResults = [];

  for (const step of nextSteps) {
    try {
      let functionName = '';
      let batchSize = 50;

      switch (step) {
        case 'openai_step1':
          functionName = 'openai-step1-batch-worker';
          break;
        case 'openai_step2':
          functionName = 'openai-step2-batch-worker';
          break;
        case 'openai_step3':
          functionName = 'openai-step3-batch-worker';
          break;
        case 'unipile':
          functionName = 'unipile-batch-worker';
          batchSize = 30;
          break;
        case 'lead_creation':
          functionName = 'lead-creation-batch-worker';
          break;
      }

      if (functionName) {
        console.log(`🚀 Triggering ${functionName} for dataset: ${datasetId}`);
        
        const { data: result, error } = await supabaseClient.functions.invoke(functionName, {
          body: { dataset_id: datasetId, batch_size: batchSize }
        });

        triggerResults.push({
          step,
          function: functionName,
          success: !error,
          error: error?.message,
          result: result
        });

        if (error) {
          console.error(`❌ Error triggering ${functionName}:`, error);
        } else {
          console.log(`✅ Successfully triggered ${functionName}`);
        }
      }
    } catch (error) {
      console.error(`❌ Exception while triggering step ${step}:`, error);
      triggerResults.push({
        step,
        success: false,
        error: error.message
      });
    }
  }

  return new Response(JSON.stringify({
    success: true,
    dataset_id: datasetId,
    triggered_steps: triggerResults,
    pipeline_status: statusData.pipeline_status
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

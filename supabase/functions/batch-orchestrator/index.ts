
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
    console.log('🎛️ Batch Orchestrator started');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { dataset_id, action = 'full_processing' } = await req.json();

    switch (action) {
      case 'full_processing':
        return await orchestrateFullProcessing(supabaseClient, dataset_id);
      
      case 'check_bottlenecks':
        return await checkProcessingBottlenecks(supabaseClient, dataset_id);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('❌ Error in batch-orchestrator:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function orchestrateFullProcessing(supabaseClient: any, datasetId?: string) {
  console.log('🎛️ Starting full processing orchestration...');
  
  const stats = {
    started_at: new Date().toISOString(),
    dataset_id: datasetId,
    steps_executed: [],
    total_processed: 0
  };

  try {
    // Étape 1: Queue les posts pending
    console.log('📥 Step 1: Queuing pending posts...');
    const queueResult = await supabaseClient.functions.invoke('processing-queue-manager', {
      body: { action: 'queue_posts' }
    });
    
    if (queueResult.data?.success) {
      stats.steps_executed.push({
        step: 'queue_posts',
        success: true,
        count: queueResult.data.queued_count,
        completed_at: new Date().toISOString()
      });
      stats.total_processed += queueResult.data.queued_count;
      console.log(`✅ Queued ${queueResult.data.queued_count} posts`);
    }

    // Attendre un peu pour que les batches Step 1 se lancent
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Étape 2: Traiter les Step 2 en attente
    console.log('🌍 Step 2: Processing language/location analysis...');
    const step2Result = await supabaseClient.functions.invoke('processing-queue-manager', {
      body: { action: 'process_next_batch', task_type: 'openai_step2' }
    });
    
    if (step2Result.data?.success) {
      stats.steps_executed.push({
        step: 'openai_step2',
        success: true,
        count: step2Result.data.processed_count,
        completed_at: new Date().toISOString()
      });
      console.log(`✅ Processed ${step2Result.data.processed_count} posts for Step 2`);
    }

    // Attendre un peu
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Étape 3: Traiter les Step 3 en attente
    console.log('🏷️ Step 3: Processing job categorization...');
    const step3Result = await supabaseClient.functions.invoke('processing-queue-manager', {
      body: { action: 'process_next_batch', task_type: 'openai_step3' }
    });
    
    if (step3Result.data?.success) {
      stats.steps_executed.push({
        step: 'openai_step3',
        success: true,
        count: step3Result.data.processed_count,
        completed_at: new Date().toISOString()
      });
      console.log(`✅ Processed ${step3Result.data.processed_count} posts for Step 3`);
    }

    // Étape 4: Traiter le scraping Unipile
    console.log('🔍 Step 4: Processing Unipile scraping...');
    const unipileResult = await supabaseClient.functions.invoke('processing-queue-manager', {
      body: { action: 'process_next_batch', task_type: 'unipile_scraping' }
    });
    
    if (unipileResult.data?.success) {
      stats.steps_executed.push({
        step: 'unipile_scraping',
        success: true,
        count: unipileResult.data.processed_count,
        completed_at: new Date().toISOString()
      });
      console.log(`✅ Processed ${unipileResult.data.processed_count} posts for Unipile`);
    }

    // Étape 5: Traiter la création de leads
    console.log('👤 Step 5: Processing lead creation...');
    const leadResult = await supabaseClient.functions.invoke('processing-queue-manager', {
      body: { action: 'process_next_batch', task_type: 'lead_creation' }
    });
    
    if (leadResult.data?.success) {
      stats.steps_executed.push({
        step: 'lead_creation',
        success: true,
        count: leadResult.data.processed_count,
        completed_at: new Date().toISOString()
      });
      console.log(`✅ Processed ${leadResult.data.processed_count} posts for Lead Creation`);
    }

    stats.completed_at = new Date().toISOString();
    
    console.log('🎉 Full processing orchestration completed');
    console.log('📊 Final stats:', stats);

    return new Response(JSON.stringify({
      success: true,
      action: 'full_processing',
      statistics: stats,
      message: 'Full processing orchestration completed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in full processing orchestration:', error);
    stats.error = error.message;
    stats.failed_at = new Date().toISOString();
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      statistics: stats
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function checkProcessingBottlenecks(supabaseClient: any, datasetId?: string) {
  console.log('🔍 Checking processing bottlenecks...');
  
  let baseQuery = supabaseClient.from('linkedin_posts').select('processing_status, openai_step1_recrute_poste, openai_step2_reponse, openai_step3_categorie, unipile_profile_scraped, approach_message_generated, lead_id');
  
  if (datasetId) {
    baseQuery = baseQuery.eq('apify_dataset_id', datasetId);
  }
  
  const { data: posts, error } = await baseQuery;
  
  if (error) {
    throw new Error(`Error fetching posts: ${error.message}`);
  }

  const bottlenecks = {
    total_posts: posts.length,
    pending: posts.filter(p => p.processing_status === 'pending').length,
    step1_pending: posts.filter(p => p.processing_status === 'processing' && !p.openai_step1_recrute_poste).length,
    step2_pending: posts.filter(p => p.openai_step1_recrute_poste === 'oui' && !p.openai_step2_reponse).length,
    step3_pending: posts.filter(p => p.openai_step2_reponse === 'oui' && !p.openai_step3_categorie).length,
    unipile_pending: posts.filter(p => p.openai_step3_categorie && !p.unipile_profile_scraped).length,
    lead_creation_pending: posts.filter(p => p.unipile_profile_scraped && !p.lead_id).length,
    completed: posts.filter(p => p.processing_status === 'completed').length,
    errors: posts.filter(p => p.processing_status === 'error').length
  };

  console.log('📊 Processing bottlenecks analysis:', bottlenecks);

  return new Response(JSON.stringify({
    success: true,
    dataset_id: datasetId,
    bottlenecks,
    recommendations: generateRecommendations(bottlenecks)
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function generateRecommendations(bottlenecks: any): string[] {
  const recommendations = [];
  
  if (bottlenecks.pending > 100) {
    recommendations.push('🚀 High number of pending posts - trigger queue processing');
  }
  
  if (bottlenecks.step1_pending > 50) {
    recommendations.push('🤖 OpenAI Step 1 bottleneck detected - increase batch size');
  }
  
  if (bottlenecks.step2_pending > 30) {
    recommendations.push('🌍 OpenAI Step 2 bottleneck - trigger batch processing');
  }
  
  if (bottlenecks.step3_pending > 30) {
    recommendations.push('🏷️ OpenAI Step 3 bottleneck - trigger batch processing');
  }
  
  if (bottlenecks.unipile_pending > 20) {
    recommendations.push('🔍 Unipile scraping bottleneck - may need rate limit adjustment');
  }
  
  if (bottlenecks.lead_creation_pending > 50) {
    recommendations.push('👤 Lead creation bottleneck - increase batch size');
  }
  
  return recommendations;
}

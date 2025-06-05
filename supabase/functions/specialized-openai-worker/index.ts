
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { executeOpenAIStep1, executeOpenAIStep2, executeOpenAIStep3 } from './step-handlers.ts'
import { processBatchOpenAIStep1, processBatchOpenAIStep2, processBatchOpenAIStep3 } from './batch-processor.ts'
import { triggerNextStep, handleOpenAIError } from './workflow-manager.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🤖 Specialized OpenAI Worker started');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { post_id, post_ids, dataset_id, step = 'step1', batch_mode = false } = await req.json();
    
    // Mode batch : traiter plusieurs posts à la fois
    if (batch_mode && post_ids && post_ids.length > 0) {
      console.log(`🎯 Processing OpenAI ${step} BATCH: ${post_ids.length} posts (dataset: ${dataset_id})`);
      
      // Récupérer tous les posts du batch
      const { data: posts, error: fetchError } = await supabaseClient
        .from('linkedin_posts')
        .select('*')
        .in('id', post_ids);

      if (fetchError || !posts) {
        throw new Error(`Failed to fetch posts for batch: ${fetchError?.message}`);
      }

      console.log(`📥 Fetched ${posts.length} posts for batch processing`);

      // Marquer tous les posts comme en traitement
      await supabaseClient
        .from('linkedin_posts')
        .update({ processing_status: 'processing' })
        .in('id', post_ids);

      let batchResult;
      try {
        switch (step) {
          case 'step1':
            batchResult = await processBatchOpenAIStep1WithImmediateTrigger(posts, supabaseClient, dataset_id);
            break;
          case 'step2':
            batchResult = await processBatchOpenAIStep2WithImmediateTrigger(posts, supabaseClient, dataset_id);
            break;
          case 'step3':
            batchResult = await processBatchOpenAIStep3WithImmediateTrigger(posts, supabaseClient, dataset_id);
            break;
          default:
            throw new Error(`Unknown step: ${step}`);
        }

        console.log(`✅ OpenAI ${step} BATCH completed: ${batchResult.success} success, ${batchResult.failed} failed`);

        // Gérer les erreurs individuelles des posts dans le batch
        const failedPostIds = [];
        for (const result of batchResult.results) {
          if (!result.success) {
            failedPostIds.push(result.post_id);
            await handleOpenAIError(supabaseClient, result.post_id, step, new Error(result.error || 'Unknown error'));
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          batch_mode: true,
          step,
          processed_count: post_ids.length,
          success_count: batchResult.success,
          failed_count: batchResult.failed,
          dataset_id,
          immediate_trigger_method: 'per_post_immediate'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        console.error(`❌ OpenAI ${step} BATCH failed:`, error);
        
        // Marquer tous les posts comme en erreur
        for (const postId of post_ids) {
          await handleOpenAIError(supabaseClient, postId, step, error);
        }
        
        throw error;
      }
    }

    // Mode single post (existant)
    if (!post_id) {
      throw new Error('Post ID is required for single post mode');
    }

    console.log(`🎯 Processing OpenAI ${step} for post: ${post_id} (dataset: ${dataset_id})`);

    // Récupérer le post
    const { data: post, error: fetchError } = await supabaseClient
      .from('linkedin_posts')
      .select('*')
      .eq('id', post_id)
      .single();

    if (fetchError || !post) {
      throw new Error(`Post not found: ${post_id}`);
    }

    // Marquer comme en traitement
    await supabaseClient
      .from('linkedin_posts')
      .update({ processing_status: 'processing' })
      .eq('id', post_id);

    let result;
    try {
      switch (step) {
        case 'step1':
          result = await executeOpenAIStep1(post, supabaseClient);
          // 🔥 NOUVEAU : Déclenchement immédiat du Step 2 si succès
          await triggerNextStepImmediately(supabaseClient, post, step, result, dataset_id);
          break;
        case 'step2':
          result = await executeOpenAIStep2(post, supabaseClient);
          // 🔥 NOUVEAU : Déclenchement immédiat du Step 3 si succès
          await triggerNextStepImmediately(supabaseClient, post, step, result, dataset_id);
          break;
        case 'step3':
          result = await executeOpenAIStep3(post, supabaseClient);
          // 🔥 NOUVEAU : Déclenchement immédiat du Unipile si succès
          await triggerNextStepImmediately(supabaseClient, post, step, result, dataset_id);
          break;
        default:
          throw new Error(`Unknown step: ${step}`);
      }

      console.log(`✅ OpenAI ${step} completed for post: ${post_id}`);

    } catch (error) {
      console.error(`❌ OpenAI ${step} failed for post ${post_id}:`, error);
      await handleOpenAIError(supabaseClient, post_id, step, error);
      throw error;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      post_id,
      step,
      result,
      dataset_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in specialized-openai-worker:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// 🔥 NOUVELLE FONCTION : Déclenchement immédiat des étapes suivantes
async function triggerNextStepImmediately(supabaseClient: any, post: any, currentStep: string, result: any, datasetId?: string) {
  try {
    console.log(`🚀 IMMEDIATE TRIGGER: ${currentStep} → next step for post ${post.id}`);
    
    switch (currentStep) {
      case 'step1':
        if (result.recrute_poste === 'oui' || result.recrute_poste === 'yes') {
          console.log(`✅ Step 1 passed for post ${post.id}, triggering Step 2 IMMEDIATELY`);
          await supabaseClient.functions.invoke('specialized-openai-worker', {
            body: { 
              post_id: post.id, 
              dataset_id: datasetId,
              step: 'step2'
            }
          });
          console.log(`🎯 Step 2 triggered immediately for post ${post.id}`);
        } else {
          console.log(`❌ Step 1 failed for post ${post.id}, marking as not_job_posting`);
          await supabaseClient
            .from('linkedin_posts')
            .update({ processing_status: 'not_job_posting' })
            .eq('id', post.id);
        }
        break;
        
      case 'step2':
        if (result.reponse === 'oui' || result.reponse === 'yes') {
          console.log(`✅ Step 2 passed for post ${post.id}, triggering Step 3 IMMEDIATELY`);
          await supabaseClient.functions.invoke('specialized-openai-worker', {
            body: { 
              post_id: post.id, 
              dataset_id: datasetId,
              step: 'step3'
            }
          });
          console.log(`🎯 Step 3 triggered immediately for post ${post.id}`);
        } else {
          console.log(`❌ Step 2 failed for post ${post.id}, marking as filtered_out`);
          await supabaseClient
            .from('linkedin_posts')
            .update({ processing_status: 'filtered_out' })
            .eq('id', post.id);
        }
        break;
        
      case 'step3':
        console.log(`✅ Step 3 completed for post ${post.id}, triggering Unipile IMMEDIATELY`);
        await supabaseClient.functions.invoke('specialized-unipile-worker', {
          body: { 
            post_id: post.id, 
            dataset_id: datasetId
          }
        });
        console.log(`🎯 Unipile triggered immediately for post ${post.id}`);
        break;
    }
  } catch (error) {
    console.error(`❌ Error triggering next step immediately for post ${post.id}:`, error);
  }
}

// 🔥 NOUVELLES FONCTIONS BATCH avec déclenchement immédiat
async function processBatchOpenAIStep1WithImmediateTrigger(posts: any[], supabaseClient: any, datasetId?: string) {
  console.log(`🔥 Processing Step 1 BATCH with IMMEDIATE triggers: ${posts.length} posts`);
  
  let successCount = 0;
  let failedCount = 0;
  const results = [];

  // Traitement par petits batches pour éviter les timeouts
  const CONCURRENT_LIMIT = 5;
  
  for (let i = 0; i < posts.length; i += CONCURRENT_LIMIT) {
    const batch = posts.slice(i, i + CONCURRENT_LIMIT);
    
    const promises = batch.map(async (post) => {
      try {
        console.log(`🤖 Processing Step 1 for post: ${post.id}`);
        
        const result = await executeOpenAIStep1(post, supabaseClient);
        
        console.log(`✅ Step 1 completed for post: ${post.id} - ${result.recrute_poste}`);
        successCount++;
        
        // 🔥 DÉCLENCHEMENT IMMÉDIAT du Step 2 si succès
        await triggerNextStepImmediately(supabaseClient, post, 'step1', result, datasetId);
        
        results.push({ post_id: post.id, success: true, analysis: result });
        
      } catch (error) {
        console.error(`❌ Step 1 failed for post ${post.id}:`, error);
        failedCount++;
        results.push({ post_id: post.id, success: false, error: error.message });
      }
    });

    await Promise.allSettled(promises);
    
    // Pause entre les batches
    if (i + CONCURRENT_LIMIT < posts.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  console.log(`📊 Step 1 Batch completed: ${successCount} success, ${failedCount} errors`);
  
  return {
    results,
    success: successCount,
    failed: failedCount
  };
}

async function processBatchOpenAIStep2WithImmediateTrigger(posts: any[], supabaseClient: any, datasetId?: string) {
  console.log(`🔥 Processing Step 2 BATCH with IMMEDIATE triggers: ${posts.length} posts`);
  
  let successCount = 0;
  let failedCount = 0;
  const results = [];

  const CONCURRENT_LIMIT = 5;
  
  for (let i = 0; i < posts.length; i += CONCURRENT_LIMIT) {
    const batch = posts.slice(i, i + CONCURRENT_LIMIT);
    
    const promises = batch.map(async (post) => {
      try {
        console.log(`🌍 Processing Step 2 for post: ${post.id}`);
        
        const result = await executeOpenAIStep2(post, supabaseClient);
        
        console.log(`✅ Step 2 completed for post: ${post.id} - ${result.reponse}`);
        successCount++;
        
        // 🔥 DÉCLENCHEMENT IMMÉDIAT du Step 3 si succès
        await triggerNextStepImmediately(supabaseClient, post, 'step2', result, datasetId);
        
        results.push({ post_id: post.id, success: true, analysis: result });
        
      } catch (error) {
        console.error(`❌ Step 2 failed for post ${post.id}:`, error);
        failedCount++;
        results.push({ post_id: post.id, success: false, error: error.message });
      }
    });

    await Promise.allSettled(promises);
    
    if (i + CONCURRENT_LIMIT < posts.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  console.log(`📊 Step 2 Batch completed: ${successCount} success, ${failedCount} errors`);
  
  return {
    results,
    success: successCount,
    failed: failedCount
  };
}

async function processBatchOpenAIStep3WithImmediateTrigger(posts: any[], supabaseClient: any, datasetId?: string) {
  console.log(`🔥 Processing Step 3 BATCH with IMMEDIATE triggers: ${posts.length} posts`);
  
  let successCount = 0;
  let failedCount = 0;
  const results = [];

  const CONCURRENT_LIMIT = 5;
  
  for (let i = 0; i < posts.length; i += CONCURRENT_LIMIT) {
    const batch = posts.slice(i, i + CONCURRENT_LIMIT);
    
    const promises = batch.map(async (post) => {
      try {
        console.log(`🏷️ Processing Step 3 for post: ${post.id}`);
        
        const result = await executeOpenAIStep3(post, supabaseClient);
        
        console.log(`✅ Step 3 completed for post: ${post.id}`);
        successCount++;
        
        // 🔥 DÉCLENCHEMENT IMMÉDIAT du Unipile
        await triggerNextStepImmediately(supabaseClient, post, 'step3', result, datasetId);
        
        results.push({ post_id: post.id, success: true, analysis: result });
        
      } catch (error) {
        console.error(`❌ Step 3 failed for post ${post.id}:`, error);
        failedCount++;
        results.push({ post_id: post.id, success: false, error: error.message });
      }
    });

    await Promise.allSettled(promises);
    
    if (i + CONCURRENT_LIMIT < posts.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  console.log(`📊 Step 3 Batch completed: ${successCount} success, ${failedCount} errors`);
  
  return {
    results,
    success: successCount,
    failed: failedCount
  };
}


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
            batchResult = await processBatchOpenAIStep1(posts, supabaseClient);
            break;
          case 'step2':
            batchResult = await processBatchOpenAIStep2(posts, supabaseClient);
            break;
          case 'step3':
            batchResult = await processBatchOpenAIStep3(posts, supabaseClient);
            break;
          default:
            throw new Error(`Unknown step: ${step}`);
        }

        console.log(`✅ OpenAI ${step} BATCH completed: ${batchResult.success} success, ${batchResult.failed} failed`);

        // 🔧 CORRECTION CRITIQUE : Déclenchement automatique optimisé du step suivant
        const triggerNextStepAsync = async () => {
          try {
            console.log(`🔄 Background: Triggering next step after ${step} batch completion...`);
            
            // Attendre un délai pour s'assurer que les mises à jour sont propagées
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Déclencher l'étape suivante selon le step actuel avec le processing queue manager
            if (step === 'step1') {
              console.log(`✅ Background: Triggering Step 2 processing for dataset: ${dataset_id}`);
              await supabaseClient.functions.invoke('processing-queue-manager', {
                body: { 
                  action: 'process_next_batch',
                  task_type: 'openai_step2',
                  dataset_id: dataset_id
                }
              });
            } else if (step === 'step2') {
              console.log(`✅ Background: Triggering Step 3 processing for dataset: ${dataset_id}`);
              await supabaseClient.functions.invoke('processing-queue-manager', {
                body: { 
                  action: 'process_next_batch',
                  task_type: 'openai_step3',
                  dataset_id: dataset_id
                }
              });
            } else if (step === 'step3') {
              console.log(`✅ Background: Triggering Unipile scraping for dataset: ${dataset_id}`);
              await supabaseClient.functions.invoke('processing-queue-manager', {
                body: { 
                  action: 'process_next_batch',
                  task_type: 'unipile_scraping',
                  dataset_id: dataset_id
                }
              });
            }
          } catch (error) {
            console.error(`❌ Background: Error triggering next step after ${step}:`, error);
          }
        };

        // Gérer les erreurs individuelles des posts dans le batch AVANT le déclenchement
        const failedPostIds = [];
        for (const result of batchResult.results) {
          if (!result.success) {
            failedPostIds.push(result.post_id);
            await handleOpenAIError(supabaseClient, result.post_id, step, new Error(result.error || 'Unknown error'));
          }
        }

        // 🎯 RETOUR IMMÉDIAT pour éviter les timeouts
        const responsePromise = new Response(JSON.stringify({ 
          success: true, 
          batch_mode: true,
          step,
          processed_count: post_ids.length,
          success_count: batchResult.success,
          failed_count: batchResult.failed,
          dataset_id,
          next_step_will_be_triggered: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

        // Lancer le déclenchement en arrière-plan APRÈS avoir préparé la réponse
        if ((globalThis as any).EdgeRuntime?.waitUntil) {
          (globalThis as any).EdgeRuntime.waitUntil(triggerNextStepAsync());
          console.log(`🚀 Next step trigger scheduled in background for ${step}`);
        } else {
          // Fallback : lancer sans attendre
          triggerNextStepAsync().catch(err => 
            console.error(`❌ Fallback trigger error for ${step}:`, err)
          );
          console.log(`🚀 Next step trigger started as fallback for ${step}`);
        }

        return responsePromise;

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
          break;
        case 'step2':
          result = await executeOpenAIStep2(post, supabaseClient);
          break;
        case 'step3':
          result = await executeOpenAIStep3(post, supabaseClient);
          break;
        default:
          throw new Error(`Unknown step: ${step}`);
      }

      console.log(`✅ OpenAI ${step} completed for post: ${post_id}`);
      
      // Déclencher l'étape suivante si nécessaire
      await triggerNextStep(supabaseClient, post, step, result);

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

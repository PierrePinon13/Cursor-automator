
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { processBatch } from './batch-processor.ts'
import { processSinglePost } from './single-processor.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🤖 OpenAI Step 1 Worker started');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      post_ids, 
      post_id, 
      dataset_id, 
      batch_mode = false,
      workflow_enabled = false
    } = await req.json();

    // Mode batch
    if (batch_mode && post_ids) {
      console.log(`🎯 Processing Step 1 BATCH: ${post_ids.length} posts`);
      
      // Récupérer tous les posts du batch
      const { data: posts, error: fetchError } = await supabaseClient
        .from('linkedin_posts')
        .select('*')
        .in('id', post_ids);

      if (fetchError || !posts) {
        throw new Error(`Failed to fetch posts: ${fetchError?.message}`);
      }

      const { processedPosts, errors, successCount, errorCount } = await processBatch(
        posts, 
        supabaseClient, 
        dataset_id, 
        workflow_enabled
      );

      // Déclencher Step 2 en arrière-plan si nécessaire
      if (successCount > 0) {
        const triggerStep2 = async () => {
          try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            await supabaseClient.functions.invoke('openai-step2-worker', {
              body: { 
                action: 'process_batch',
                dataset_id: dataset_id
              }
            });
            console.log('✅ Step 2 triggered successfully');
          } catch (error) {
            console.error('❌ Error triggering Step 2:', error);
          }
        };

        if ((globalThis as any).EdgeRuntime?.waitUntil) {
          (globalThis as any).EdgeRuntime.waitUntil(triggerStep2());
        } else {
          triggerStep2().catch(console.error);
        }
      }

      return new Response(JSON.stringify({ 
        success: true,
        processed_count: posts.length,
        success_count: successCount,
        error_count: errorCount,
        step: 'step1'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Mode single post
    if (post_id) {
      const { data: post, error: fetchError } = await supabaseClient
        .from('linkedin_posts')
        .select('*')
        .eq('id', post_id)
        .single();

      if (fetchError || !post) {
        throw new Error(`Failed to fetch post: ${fetchError?.message}`);
      }

      const result = await processSinglePost(post, supabaseClient, dataset_id, workflow_enabled);

      return new Response(JSON.stringify({ 
        success: true,
        processed_count: 1,
        success_count: 1,
        error_count: 0,
        step: 'step1',
        result: result
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    throw new Error('Either post_id or post_ids must be provided');

  } catch (error) {
    console.error('❌ Error in openai-step1-worker:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

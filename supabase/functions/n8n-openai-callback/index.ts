
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { processFilteredPosts, triggerUnipileProcessing, LeadProcessingResult } from './lead-processor.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 N8N OpenAI Callback - Processing request')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const requestBody = await req.json()
    console.log('📥 Received callback payload:', JSON.stringify(requestBody, null, 2))
    
    // Gérer différents formats de payload
    let batch_id, dataset_id, filtered_posts = []
    
    if (Array.isArray(requestBody) && requestBody.length > 0) {
      // Format array avec body et filtered_posts séparés
      const firstItem = requestBody[0]
      if (firstItem.body && firstItem.filtered_posts) {
        batch_id = firstItem.body.batch_id
        dataset_id = firstItem.body.dataset_id
        filtered_posts = firstItem.filtered_posts
      } else if (firstItem.batch_id && firstItem.dataset_id) {
        // Format array avec seulement les métadonnées du batch
        batch_id = firstItem.batch_id
        dataset_id = firstItem.dataset_id
        filtered_posts = [] // Pas de posts filtrés dans ce cas
      } else {
        throw new Error('Invalid array format: missing required fields')
      }
    } else if (requestBody.batch_id && requestBody.dataset_id) {
      // Format direct avec métadonnées seulement
      batch_id = requestBody.batch_id
      dataset_id = requestBody.dataset_id
      filtered_posts = requestBody.filtered_posts || [] // Posts optionnels
    } else {
      throw new Error('Invalid payload format: missing batch_id or dataset_id')
    }
    
    if (!batch_id || !dataset_id) {
      console.error('❌ Invalid callback payload structure')
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Invalid payload: batch_id and dataset_id are required',
        received_keys: Object.keys(requestBody)
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Si pas de posts filtrés, juste confirmer la réception
    if (filtered_posts.length === 0) {
      console.log('ℹ️ No filtered posts in this callback - batch metadata only')
      
      const result: LeadProcessingResult = {
        success: true,
        batch_id: batch_id,
        dataset_id: dataset_id,
        posts_received: 0,
        posts_created: 0,
        posts_skipped: 0,
        processing_errors: 0,
        unipile_triggered: false,
        message: 'Batch metadata received successfully - no posts to process'
      }

      console.log(`✅ N8N callback completed (metadata only):`, result)

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Traiter les posts filtrés
    const processingResult = await processFilteredPosts(
      supabaseClient,
      filtered_posts,
      dataset_id,
      batch_id
    );

    // Déclencher le traitement Unipile
    await triggerUnipileProcessing(supabaseClient, dataset_id, processingResult.posts_created);
    processingResult.unipile_triggered = processingResult.posts_created > 0;

    console.log(`✅ N8N callback completed:`, processingResult);

    return new Response(JSON.stringify(processingResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in n8n-openai-callback:', error?.message)
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Internal server error',
      message: error?.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

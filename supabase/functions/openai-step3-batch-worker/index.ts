
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
    console.log('🏷️ OpenAI Step 3 Batch Worker - Starting');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { dataset_id, batch_size = 50 } = await req.json();
    
    console.log(`🎯 Processing OpenAI Step 3 batch for dataset: ${dataset_id}`);

    // Récupérer les posts validés pour Step 3
    const { data: posts, error: fetchError } = await supabaseClient
      .from('linkedin_posts')
      .select('*')
      .eq('processing_status', 'queued_step3')
      .eq('apify_dataset_id', dataset_id)
      .limit(batch_size);

    if (fetchError) {
      throw new Error(`Failed to fetch posts: ${fetchError.message}`);
    }

    if (!posts || posts.length === 0) {
      console.log('✅ No posts queued for Step 3');
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No posts to process',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📥 Processing ${posts.length} posts for OpenAI Step 3`);

    // Marquer les posts comme en traitement
    await supabaseClient
      .from('linkedin_posts')
      .update({ processing_status: 'processing_step3' })
      .in('id', posts.map(p => p.id));

    const results = {
      processed: 0,
      passed: 0,
      failed: 0,
      errors: []
    };

    const CONCURRENT_LIMIT = 5;
    const passedPostIds = [];

    for (let i = 0; i < posts.length; i += CONCURRENT_LIMIT) {
      const batch = posts.slice(i, i + CONCURRENT_LIMIT);
      
      const promises = batch.map(async (post) => {
        try {
          console.log(`🏷️ Processing Step 3 for post: ${post.id}`);
          
          const prompt = `Catégorisez ce post de recrutement et sélectionnez les postes pertinents.

Post: "${post.text}"
Postes détectés: "${post.openai_step1_postes}"

Catégories disponibles: Tech, Business, Product, Executive Search, Comptelio, RH, Freelance, Data, Autre

Répondez en JSON:
{
  "categorie": "catégorie principale",
  "postes_selectionnes": ["liste des postes"],
  "justification": "explication du choix"
}`;

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: 'Tu es un expert en catégorisation d\'offres d\'emploi. Réponds uniquement en JSON valide.'
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              response_format: { type: 'json_object' },
              temperature: 0.1,
              max_tokens: 400
            }),
          });

          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
          }

          const result = JSON.parse(data.choices[0].message.content);
          
          // Tous les posts Step 3 passent à Unipile (sauf catégorie "Autre")
          const newStatus = result.categorie === 'Autre' ? 'rejected_step3' : 'queued_unipile';

          // Sauvegarder les résultats
          await supabaseClient
            .from('linkedin_posts')
            .update({
              openai_step3_categorie: result.categorie,
              openai_step3_postes_selectionnes: result.postes_selectionnes,
              openai_step3_justification: result.justification,
              openai_step3_response: data,
              processing_status: newStatus,
              last_updated_at: new Date().toISOString()
            })
            .eq('id', post.id);

          results.processed++;
          if (result.categorie !== 'Autre') {
            results.passed++;
            passedPostIds.push(post.id);
          }

          console.log(`✅ Step 3 completed for post: ${post.id} - ${result.categorie}`);

        } catch (error) {
          console.error(`❌ Step 3 failed for post ${post.id}:`, error);
          
          await supabaseClient
            .from('linkedin_posts')
            .update({
              processing_status: 'error_step3',
              retry_count: (post.retry_count || 0) + 1,
              last_retry_at: new Date().toISOString()
            })
            .eq('id', post.id);

          results.failed++;
          results.errors.push({ post_id: post.id, error: error.message });
        }
      });

      await Promise.allSettled(promises);
      
      if (i + CONCURRENT_LIMIT < posts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Déclencher Unipile si on a des posts validés
    if (passedPostIds.length > 0) {
      console.log(`🚀 Triggering Unipile batch for ${passedPostIds.length} validated posts...`);
      
      const { error: triggerError } = await supabaseClient.functions.invoke('unipile-batch-worker', {
        body: { 
          dataset_id,
          batch_size: Math.min(passedPostIds.length, 30) // Unipile plus lent
        }
      });

      if (triggerError) {
        console.error('⚠️ Failed to trigger Unipile batch:', triggerError);
      } else {
        console.log('✅ Unipile batch triggered successfully');
      }
    }

    const finalResult = {
      success: true,
      dataset_id,
      batch_size: posts.length,
      ...results,
      unipile_triggered: passedPostIds.length > 0
    };

    console.log('📊 OpenAI Step 3 Batch completed:', finalResult);

    return new Response(JSON.stringify(finalResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in openai-step3-batch-worker:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

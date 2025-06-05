
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
    console.log('🌍 OpenAI Step 2 Batch Worker - Starting');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { dataset_id, batch_size = 50 } = await req.json();
    
    console.log(`🎯 Processing OpenAI Step 2 batch for dataset: ${dataset_id}`);

    // Récupérer les posts validés pour Step 2
    const { data: posts, error: fetchError } = await supabaseClient
      .from('linkedin_posts')
      .select('*')
      .eq('processing_status', 'queued_step2')
      .eq('apify_dataset_id', dataset_id)
      .limit(batch_size);

    if (fetchError) {
      throw new Error(`Failed to fetch posts: ${fetchError.message}`);
    }

    if (!posts || posts.length === 0) {
      console.log('✅ No posts queued for Step 2');
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No posts to process',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📥 Processing ${posts.length} posts for OpenAI Step 2`);

    // Marquer les posts comme en traitement
    await supabaseClient
      .from('linkedin_posts')
      .update({ processing_status: 'processing_step2' })
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
          console.log(`🌍 Processing Step 2 for post: ${post.id}`);
          
          const prompt = `Analysez ce post de recrutement pour la langue et la localisation.

Post: "${post.text}"
Auteur: ${post.author_name}

Critères:
- Langue: Français uniquement
- Localisation: France, Belgique, Suisse, Luxembourg, Canada francophone

Répondez en JSON:
{
  "reponse": "oui" ou "non",
  "langue": "langue détectée",
  "localisation_detectee": "pays/région",
  "raison": "explication si non"
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
                  content: 'Tu es un expert en analyse linguistique et géographique. Réponds uniquement en JSON valide.'
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              response_format: { type: 'json_object' },
              temperature: 0.1,
              max_tokens: 300
            }),
          });

          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
          }

          const result = JSON.parse(data.choices[0].message.content);
          const normalizedResponse = result.reponse?.toLowerCase() === 'oui' ? 'oui' : 'non';
          const newStatus = normalizedResponse === 'oui' ? 'queued_step3' : 'rejected_step2';

          // Sauvegarder les résultats
          await supabaseClient
            .from('linkedin_posts')
            .update({
              openai_step2_reponse: normalizedResponse,
              openai_step2_langue: result.langue,
              openai_step2_localisation: result.localisation_detectee,
              openai_step2_raison: result.raison,
              openai_step2_response: data,
              processing_status: newStatus,
              last_updated_at: new Date().toISOString()
            })
            .eq('id', post.id);

          results.processed++;
          if (normalizedResponse === 'oui') {
            results.passed++;
            passedPostIds.push(post.id);
          }

          console.log(`✅ Step 2 completed for post: ${post.id} - ${normalizedResponse}`);

        } catch (error) {
          console.error(`❌ Step 2 failed for post ${post.id}:`, error);
          
          await supabaseClient
            .from('linkedin_posts')
            .update({
              processing_status: 'error_step2',
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

    // Déclencher Step 3 si on a des posts validés
    if (passedPostIds.length > 0) {
      console.log(`🚀 Triggering OpenAI Step 3 for ${passedPostIds.length} validated posts...`);
      
      const { error: triggerError } = await supabaseClient.functions.invoke('openai-step3-batch-worker', {
        body: { 
          dataset_id,
          batch_size: Math.min(passedPostIds.length, 50)
        }
      });

      if (triggerError) {
        console.error('⚠️ Failed to trigger OpenAI Step 3:', triggerError);
      } else {
        console.log('✅ OpenAI Step 3 batch triggered successfully');
      }
    }

    const finalResult = {
      success: true,
      dataset_id,
      batch_size: posts.length,
      ...results,
      step3_triggered: passedPostIds.length > 0
    };

    console.log('📊 OpenAI Step 2 Batch completed:', finalResult);

    return new Response(JSON.stringify(finalResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in openai-step2-batch-worker:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

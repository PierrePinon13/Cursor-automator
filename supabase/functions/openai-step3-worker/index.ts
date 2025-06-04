
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
    console.log('🏷️ OpenAI Step 3 Worker started');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    const { action, dataset_id } = await req.json();
    
    if (action === 'process_batch') {
      console.log(`🔍 Looking for posts ready for Step 3 (dataset: ${dataset_id})`);
      
      // Récupérer les posts qui ont passé Step 2
      const { data: posts, error: fetchError } = await supabaseClient
        .from('linkedin_posts')
        .select('*')
        .eq('openai_step2_reponse', 'oui')
        .is('openai_step3_categorie', null)
        .eq('processing_status', 'processing')
        .eq('apify_dataset_id', dataset_id)
        .limit(200);

      if (fetchError) {
        throw new Error(`Failed to fetch posts: ${fetchError.message}`);
      }

      if (!posts || posts.length === 0) {
        console.log('📝 No posts ready for Step 3');
        return new Response(JSON.stringify({ 
          success: true,
          message: 'No posts ready for Step 3',
          processed_count: 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`🔥 Processing Step 3 for ${posts.length} posts`);

      let successCount = 0;
      let errorCount = 0;

      const CONCURRENT_LIMIT = 5;
      
      for (let i = 0; i < posts.length; i += CONCURRENT_LIMIT) {
        const batch = posts.slice(i, i + CONCURRENT_LIMIT);
        
        const promises = batch.map(async (post) => {
          try {
            console.log(`🏷️ Processing Step 3 for post: ${post.id}`);
            
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
                    content: `Catégorisez ce post de recrutement et sélectionnez les postes pertinents.

Catégories disponibles: Tech, Business, Product, Executive Search, Comptelio, RH, Freelance, Data, Autre

Répondez en JSON:
{
  "categorie": "catégorie principale",
  "postes_selectionnes": ["liste des postes"],
  "justification": "explication du choix"
}`
                  },
                  {
                    role: 'user',
                    content: `Post: "${post.text}"
Postes détectés: "${post.openai_step1_postes}"`
                  }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.1
              }),
            });

            const data = await response.json();
            const result = JSON.parse(data.choices[0].message.content);

            // Sauvegarder les résultats
            await supabaseClient
              .from('linkedin_posts')
              .update({
                openai_step3_categorie: result.categorie,
                openai_step3_postes_selectionnes: result.postes_selectionnes,
                openai_step3_justification: result.justification,
                openai_step3_response: data,
                last_updated_at: new Date().toISOString()
              })
              .eq('id', post.id);

            console.log(`✅ Step 3 completed for post: ${post.id} - ${result.categorie}`);
            successCount++;

          } catch (error) {
            console.error(`❌ Step 3 failed for post ${post.id}:`, error);
            
            await supabaseClient
              .from('linkedin_posts')
              .update({
                processing_status: 'error',
                retry_count: supabaseClient.rpc('increment', { x: 1 }),
                last_retry_at: new Date().toISOString()
              })
              .eq('id', post.id);
              
            errorCount++;
          }
        });

        await Promise.allSettled(promises);
        
        if (i + CONCURRENT_LIMIT < posts.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log(`📊 Step 3 Batch completed: ${successCount} success, ${errorCount} errors`);

      // Déclencher Unipile scraping en arrière-plan
      const triggerUnipile = async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          await supabaseClient.functions.invoke('specialized-unipile-worker', {
            body: { 
              action: 'process_batch',
              dataset_id: dataset_id
            }
          });
          console.log('✅ Unipile scraping triggered successfully');
        } catch (error) {
          console.error('❌ Error triggering Unipile scraping:', error);
        }
      };

      if ((globalThis as any).EdgeRuntime?.waitUntil) {
        (globalThis as any).EdgeRuntime.waitUntil(triggerUnipile());
      } else {
        triggerUnipile().catch(console.error);
      }

      return new Response(JSON.stringify({ 
        success: true,
        processed_count: posts.length,
        success_count: successCount,
        error_count: errorCount,
        step: 'step3'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in openai-step3-worker:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

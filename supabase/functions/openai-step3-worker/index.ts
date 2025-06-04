
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
                    content: `# CONTEXT

Vous êtes un assistant spécialisé dans l'analyse des publications LinkedIn pour l'équipe commerciale d'un cabinet de recrutement. Votre mission est d'examiner une publication LinkedIn, en vous concentrant principalement sur les **postes mentionnés par l'utilisateur**, afin de classer ces postes dans **une seule catégorie d'offre** et de normaliser les titres associés.

# OBJECTIVE

Analyser la publication LinkedIn et les postes fournis par l'utilisateur pour :

1. Sélectionner **une seule** catégorie parmi les 9 proposées.
2. Identifier les postes fournis qui relèvent de cette catégorie.
3. Les normaliser selon les règles fournies.

# INSTRUCTIONS

1. Analysez les postes indiqués par l'utilisateur dans la section suivante :

${post.openai_step1_postes}

2. Utilisez les **définitions et exemples présents dans le system prompt** des catégories suivantes pour déterminer à laquelle les postes appartiennent le mieux :

* Tech
* Business
* Product
* Executive Search
* Comptelio
* RH
* Freelance
* Data
* Autre

3. Sélectionnez **une seule catégorie dominante**. Elle peut regrouper tous les postes ou une majorité.

   * Si un poste peut entrer dans plusieurs catégories, choisissez celle qui reflète **la dimension métier principale**.
   * Si aucune catégorie ne correspond, choisissez "Autre".

4. Repérez dans la liste fournie uniquement les postes qui **correspondent à la catégorie sélectionnée**. Ignorez les autres.

5. **Normalisez** chaque titre sélectionné :

   * Se baser sur le titre de poste tel qu'il est partagé par l'utilisateur
   * Conserver le **cœur du métier**, tel qu'on le dirait à l'oral. 
   * Toujours au **masculin singulier**.
   * Pas de majuscules sauf noms propres.

# FORMAT DE SORTIE

Répondez dans le format JSON suivant :

\`\`\`json
{
  "categorie": "Tech" | "Business" | "Product" | "Executive Search" | "Comptelio" | "RH" | "Freelance" | "Data" | "Autre",
  "postes_selectionnes": [
    "intitulé normalisé 1",
    "intitulé normalisé 2"
  ],
  "justification": "Courte explication du choix de la catégorie sélectionnée. Mentionnez les postes correspondants et pourquoi ils relèvent de cette catégorie."
}
\`\`\``
                  },
                  {
                    role: 'user',
                    content: `# PUBLICATION LINKEDIN À ANALYSER

\`\`\`text
${post.title || ''}
${post.text}
\`\`\`

# POSTES DÉTECTÉS EN ÉTAPE 1

${post.openai_step1_postes || 'Aucun poste spécifique détecté'}`
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

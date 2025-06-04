
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
    console.log('🤖 OpenAI Step 1 Worker started');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    const { post_ids, dataset_id, batch_mode = false } = await req.json();
    
    if (batch_mode && post_ids?.length > 0) {
      console.log(`🔥 Processing Step 1 BATCH: ${post_ids.length} posts`);
      
      // Récupérer tous les posts du batch
      const { data: posts, error: fetchError } = await supabaseClient
        .from('linkedin_posts')
        .select('*')
        .in('id', post_ids);

      if (fetchError || !posts) {
        throw new Error(`Failed to fetch posts: ${fetchError?.message}`);
      }

      let successCount = 0;
      let errorCount = 0;

      // Traitement par petits batches pour éviter les timeouts
      const CONCURRENT_LIMIT = 5;
      
      for (let i = 0; i < posts.length; i += CONCURRENT_LIMIT) {
        const batch = posts.slice(i, i + CONCURRENT_LIMIT);
        
        const promises = batch.map(async (post) => {
          try {
            console.log(`🤖 Processing Step 1 for post: ${post.id}`);
            
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
                    content: `### 🔍 CONTEXTE

Vous analysez un post LinkedIn afin de détecter si **l'auteur recrute activement pour son entreprise** (recrutement interne, pas pour un client).

---

### 🎯 OBJECTIF

Retourner un objet JSON avec les deux champs suivants :

\`\`\`json
{
  "recrute_poste": "Oui" | "Non",
  "postes": "poste1, poste2, poste3"
}
\`\`\`

* **recrute_poste** :
  * "Oui" si le post parle d'un **recrutement actif et ciblé pour l'entreprise de l'auteur**.
  * Sinon, "Non".

* **postes** :
  * Une liste (max 3) des postes précis recherchés, séparés par des virgules.
  * Laisser vide (\`""\`) si aucun poste clair n'est mentionné.
  * ⚠️ Si plus de **3 postes différents** sont cités, répondre automatiquement :
    * \`"recrute_poste": "Non"\`
    * \`"postes": ""\`

---

### ✅ CLASSER "Oui" SI :

Le post :
* Représente un **recrutement actif et ciblé** de la part de l'auteur pour son entreprise.
* Mentionne des **postes précis** (hors stagiaires, alternants, techniciens, assistants).
* Contient des expressions claires comme :
  * "Nous recrutons", "On recrute", "Poste ouvert", "Offre d'emploi", "Rejoignez notre équipe", etc.
* Fait référence à un lien d'offre, ou redirige vers un site carrière.
* Mentionne **au maximum 3 profils différents**.

---

### ❌ CLASSER "Non" SI :

Le post :
* Provient d'un **freelance, ESN, ou cabinet** qui recrute pour un **client externe**.
* Est écrit par quelqu'un **à la recherche d'un emploi** (ex : "je cherche un CDI", "je recherche une alternance").
* Concerne uniquement des **stages, alternances, techniciens, assistants**.
* Mentionne **plus de 3 postes** (même s'ils sont clairs et précis).
* Est **vague, non ciblé ou purement théorique**.
* **Ne mentionne aucun poste clair**.

Soyez TRÈS attentif aux nuances et analysez bien si c'est l'entreprise de l'auteur qui recrute directement.`
                  },
                  {
                    role: 'user',
                    content: `Analysez ce post LinkedIn :

Titre : ${post.title || 'Aucun titre'}

Contenu : ${post.text}

Auteur : ${post.author_name}`
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
                openai_step1_recrute_poste: result.recrute_poste,
                openai_step1_postes: result.postes,
                openai_step1_response: data,
                processing_status: result.recrute_poste === 'oui' ? 'processing' : 'not_job_posting',
                last_updated_at: new Date().toISOString()
              })
              .eq('id', post.id);

            console.log(`✅ Step 1 completed for post: ${post.id} - ${result.recrute_poste}`);
            successCount++;

          } catch (error) {
            console.error(`❌ Step 1 failed for post ${post.id}:`, error);
            
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
        
        // Pause entre les batches
        if (i + CONCURRENT_LIMIT < posts.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log(`📊 Step 1 Batch completed: ${successCount} success, ${errorCount} errors`);

      // Déclencher Step 2 en arrière-plan
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

    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in openai-step1-worker:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

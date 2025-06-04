
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
    console.log('🌍 OpenAI Step 2 Worker started');
    
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
      console.log(`🔍 Looking for posts ready for Step 2 (dataset: ${dataset_id})`);
      
      // ✅ CORRECTION : Requête insensible à la casse pour Step 1
      const { data: posts, error: fetchError } = await supabaseClient
        .from('linkedin_posts')
        .select('*')
        .ilike('openai_step1_recrute_poste', 'oui') // insensible à la casse
        .is('openai_step2_reponse', null)
        .eq('processing_status', 'processing')
        .eq('apify_dataset_id', dataset_id)
        .limit(200);

      if (fetchError) {
        throw new Error(`Failed to fetch posts: ${fetchError.message}`);
      }

      if (!posts || posts.length === 0) {
        console.log('📝 No posts ready for Step 2');
        
        // ✅ DEBUG : Vérifier combien de posts ont passé Step 1
        const { data: debugPosts, error: debugError } = await supabaseClient
          .from('linkedin_posts')
          .select('id, openai_step1_recrute_poste, openai_step2_reponse, processing_status')
          .eq('apify_dataset_id', dataset_id)
          .not('openai_step1_recrute_poste', 'is', null);
        
        if (!debugError && debugPosts) {
          console.log(`🔍 DEBUG: Found ${debugPosts.length} posts with Step 1 results for dataset ${dataset_id}`);
          const step1OuiPosts = debugPosts.filter(p => p.openai_step1_recrute_poste?.toLowerCase() === 'oui');
          console.log(`🔍 DEBUG: ${step1OuiPosts.length} posts have Step 1 = "oui" (case insensitive)`);
          
          if (step1OuiPosts.length > 0) {
            console.log(`🔍 DEBUG: Example posts with Step 1 "oui":`, step1OuiPosts.slice(0, 3).map(p => ({
              id: p.id,
              step1_result: p.openai_step1_recrute_poste,
              step2_result: p.openai_step2_reponse,
              status: p.processing_status
            })));
          }
        }
        
        return new Response(JSON.stringify({ 
          success: true,
          message: 'No posts ready for Step 2',
          processed_count: 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`🔥 Processing Step 2 for ${posts.length} posts`);

      let successCount = 0;
      let errorCount = 0;

      const CONCURRENT_LIMIT = 5;
      
      for (let i = 0; i < posts.length; i += CONCURRENT_LIMIT) {
        const batch = posts.slice(i, i + CONCURRENT_LIMIT);
        
        const promises = batch.map(async (post) => {
          try {
            console.log(`🌍 Processing Step 2 for post: ${post.id}`);
            
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
                    content: `# CONTEXTE
Vous êtes un assistant spécialisé dans l'analyse des publications LinkedIn pour un cabinet de recrutement. Votre mission est d'examiner un post LinkedIn dans lequel un auteur indique chercher à recruter un profil spécifique, afin de déterminer si le poste est situé en France, Belgique, Suisse, Monaco ou Luxembourg.

# OBJECTIF
Analyser le texte du post LinkedIn pour classer le recrutement comme "Oui" ou "Non" selon les critères définis ci-dessous, **et fournir une explication structurée du raisonnement**.

# INSTRUCTIONS
1. Examinez le contenu du post LinkedIn pour identifier la **langue du texte** et les **mentions de localisation**.
2. Répondez **"Oui"** si :
   - Le post mentionne clairement une localisation en **France, Belgique, Suisse, Luxembourg ou Monaco**.
   - Ou si le post est rédigé en **français** et **aucun indice ne suggère que le poste est situé hors de cette zone** (même si aucune localisation explicite n'est donnée).
   - **IMPORTANT** : Un post en français SANS mention de localisation doit être considéré comme "Oui" par défaut, sauf si des indices clairs indiquent le contraire.
3. Répondez **"Non"** UNIQUEMENT si :
   - Une localisation est clairement mentionnée **hors de la zone cible** (ex : Canada, Allemagne, Maroc…).
   - Ou si le post **n'est pas rédigé en français** et **n'indique pas clairement** que le poste se situe dans la zone cible.

**RÈGLE SPÉCIALE** : Si le post est en français et qu'aucune localisation hors zone n'est mentionnée, répondez toujours "Oui".

# FORMAT DE SORTIE
La réponse doit être fournie dans le format suivant (JSON) :

\`\`\`json
{
  "reponse": "Oui" ou "Non",
  "langue": "français" ou autre (ex : "anglais"),
  "localisation_detectee": "texte extrait indiquant une localisation, s'il y en a, sinon 'non spécifiée'",
  "raison": "explication courte justifiant la réponse (ex : 'Post en français sans mention hors zone', 'Localisation indiquée : Berlin, hors zone', etc.)"
}
\`\`\``
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

            // ✅ CORRECTION : Normaliser la réponse et utiliser le bon statut
            const normalizedResponse = result.reponse?.toLowerCase() === 'oui' ? 'oui' : 'non';
            const newStatus = normalizedResponse === 'oui' ? 'processing' : 'filtered_out';

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

            console.log(`✅ Step 2 completed for post: ${post.id} - ${normalizedResponse} (status: ${newStatus})`);
            successCount++;

          } catch (error) {
            console.error(`❌ Step 2 failed for post ${post.id}:`, error);
            
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

      console.log(`📊 Step 2 Batch completed: ${successCount} success, ${errorCount} errors`);

      // Déclencher Step 3 en arrière-plan
      const triggerStep3 = async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          await supabaseClient.functions.invoke('openai-step3-worker', {
            body: { 
              action: 'process_batch',
              dataset_id: dataset_id
            }
          });
          console.log('✅ Step 3 triggered successfully');
        } catch (error) {
          console.error('❌ Error triggering Step 3:', error);
        }
      };

      if ((globalThis as any).EdgeRuntime?.waitUntil) {
        (globalThis as any).EdgeRuntime.waitUntil(triggerStep3());
      } else {
        triggerStep3().catch(console.error);
      }

      return new Response(JSON.stringify({ 
        success: true,
        processed_count: posts.length,
        success_count: successCount,
        error_count: errorCount,
        step: 'step2'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in openai-step2-worker:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

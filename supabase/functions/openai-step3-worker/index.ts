import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CorrelationLogger, updatePostWithCorrelation, handleWorkerError } from '../shared/correlation-logger.ts'
import { callOpenAIStep3 } from './openai-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // ✅ CORRECTION CRITIQUE : Validation et nettoyage des paramètres
    const cleanDatasetId = dataset_id && dataset_id !== 'null' && dataset_id !== null ? dataset_id : null;

    // Mode batch
    if (batch_mode && post_ids && Array.isArray(post_ids) && post_ids.length > 0) {
      console.log(`🏷️ Processing Step 3 BATCH: ${post_ids.length} posts`);
      
      // ✅ CORRECTION : Filtrer les IDs valides et vérifier qu'ils sont bien des UUIDs
      const validPostIds = post_ids.filter(id => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return id && typeof id === 'string' && uuidRegex.test(id);
      });

      if (validPostIds.length === 0) {
        throw new Error('No valid post IDs provided');
      }

      const { data: posts, error: fetchError } = await supabaseClient
        .from('linkedin_posts')
        .select('*')
        .in('id', validPostIds);

      if (fetchError || !posts) {
        throw new Error(`Failed to fetch posts: ${fetchError?.message}`);
      }

      let successCount = 0;
      let errorCount = 0;
      const CONCURRENT_LIMIT = 5;
      
      for (let i = 0; i < posts.length; i += CONCURRENT_LIMIT) {
        const batch = posts.slice(i, i + CONCURRENT_LIMIT);
        
        const promises = batch.map(async (post) => {
          try {
            await processSinglePost(post, supabaseClient, cleanDatasetId);
            successCount++;
          } catch (error) {
            console.error(`❌ Step 3 failed for post ${post.id}:`, error);
            errorCount++;
          }
        });

        await Promise.allSettled(promises);
        
        if (i + CONCURRENT_LIMIT < posts.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
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

    // Mode single post
    if (post_id) {
      // ✅ CORRECTION : Validation de l'UUID du post
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!post_id || typeof post_id !== 'string' || !uuidRegex.test(post_id)) {
        throw new Error(`Invalid post ID format: ${post_id}`);
      }
      
      const { data: post, error: fetchError } = await supabaseClient
        .from('linkedin_posts')
        .select('*')
        .eq('id', post_id)
        .single();

      if (fetchError || !post) {
        throw new Error(`Failed to fetch post: ${fetchError?.message}`);
      }

      const result = await processSinglePost(post, supabaseClient, cleanDatasetId);

      return new Response(JSON.stringify({ 
        success: true,
        processed_count: 1,
        success_count: 1,
        error_count: 0,
        step: 'step3',
        result: result
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    throw new Error('Either post_id or post_ids must be provided');

  } catch (error) {
    console.error('❌ Error in openai-step3-worker:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processSinglePost(post: any, supabaseClient: any, datasetId?: string) {
  console.log(`🏷️ Processing Step 3 for post: ${post.id}`);
  
  const { result, fullResponse } = await callOpenAIStep3(post);
  await updatePostStep3Results(supabaseClient, post.id, result, fullResponse);
  
  console.log(`✅ Step 3 completed for post: ${post.id} - ${result.categorie}`);
  
  // 🔥 NOUVEAU : Déclenchement immédiat d'Unipile
  console.log(`✅ Step 3 completed for post ${post.id}, triggering Unipile IMMEDIATELY`);
  try {
    await supabaseClient.functions.invoke('specialized-unipile-worker', {
      body: { 
        post_id: post.id,
        dataset_id: datasetId || null,
        workflow_trigger: true
      }
    });
    console.log(`🎯 Unipile triggered immediately for post ${post.id}`);
  } catch (error) {
    console.error(`❌ Error triggering Unipile for post ${post.id}:`, error);
  }
  
  return { post_id: post.id, success: true, analysis: result };
}

async function callOpenAIStep3(post: any) {
  console.log('🏷️ Calling OpenAI Step 3 API');
  
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
          content: `### 🏷️ CONTEXTE

Vous devez catégoriser une offre d'emploi LinkedIn et sélectionner les postes les plus pertinents.

---

### 🎯 OBJECTIF

Retourner un objet JSON avec les champs suivants :

\`\`\`json
{
  "categorie": "Vente" | "Marketing" | "Tech" | "RH" | "Finance" | "Autre",
  "postes_selectionnes": ["poste1", "poste2"],
  "justification": "Explication courte du choix"
}
\`\`\`

### 📋 CATÉGORIES :

* **Vente** : Commercial, Account Manager, Sales, Business Developer
* **Marketing** : Marketing Manager, Communication, Brand Manager, Growth
* **Tech** : Développeur, Data, Product Manager, DevOps, CTO
* **RH** : Recruteur, HR Manager, People & Culture
* **Finance** : Contrôleur, CFO, Comptable, Finance Manager
* **Autre** : Si aucune catégorie ne correspond

### 🎯 SÉLECTION DES POSTES :

Sélectionnez max 2 postes les plus pertinents parmi ceux identifiés à l'étape 1.
Privilégiez les postes séniors et managériaux.`
        },
        {
          role: 'user',
          content: `Catégorisez cette offre :

Titre : ${post.title || 'Aucun titre'}

Contenu : ${post.text}

Postes identifiés : ${post.openai_step1_postes || 'Non spécifiés'}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    }),
  });

  const data = await response.json();
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
    throw new Error('Invalid OpenAI response');
  }
  
  let result;
  try {
    result = JSON.parse(data.choices[0].message.content);
  } catch (parseError) {
    throw new Error('Failed to parse OpenAI response as JSON');
  }
  
  return { result, fullResponse: data };
}

async function updatePostStep3Results(supabaseClient: any, postId: string, result: any, fullResponse: any) {
  await supabaseClient
    .from('linkedin_posts')
    .update({
      openai_step3_categorie: result.categorie,
      openai_step3_postes_selectionnes: result.postes_selectionnes,
      openai_step3_justification: result.justification,
      openai_step3_response: fullResponse,
      processing_status: 'processing',
      last_updated_at: new Date().toISOString()
    })
    .eq('id', postId);

  return { categorie: result.categorie };
}

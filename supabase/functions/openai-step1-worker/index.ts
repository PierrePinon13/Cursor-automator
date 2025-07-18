import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CorrelationLogger, updatePostWithCorrelation, handleWorkerError } from '../shared/correlation-logger.ts'
import { callOpenAIStep1 } from './openai-client.ts'

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
      const correlationId = CorrelationLogger.generateCorrelationId();
      const logger = new CorrelationLogger({
        correlationId,
        postId: 'BATCH',
        step: 'step1_batch',
        datasetId: cleanDatasetId
      }, supabaseClient);

      logger.info(`Processing Step 1 BATCH: ${post_ids.length} posts`);
      
      // ✅ VALIDATION AMÉLIORÉE : Filtrer les IDs valides et diagnostiquer les problèmes
      const validPostIds = [];
      const invalidPostIds = [];
      
      for (const id of post_ids) {
        if (!id) {
          invalidPostIds.push({ id: id, reason: 'null_or_undefined' });
          continue;
        }
        
        if (typeof id !== 'string') {
          invalidPostIds.push({ id: id, reason: 'not_string', type: typeof id });
          continue;
        }
        
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
          invalidPostIds.push({ id: id, reason: 'invalid_uuid_format' });
          continue;
        }
        
        validPostIds.push(id);
      }

      // Log détaillé des problèmes de validation
      if (invalidPostIds.length > 0) {
        logger.error(`Found ${invalidPostIds.length} invalid post IDs:`, invalidPostIds.slice(0, 5));
      }

      if (validPostIds.length === 0) {
        logger.error('No valid post IDs provided', { 
          total_received: post_ids.length,
          sample_invalid: invalidPostIds.slice(0, 3),
          dataset_id: cleanDatasetId
        });
        throw new Error('No valid post IDs provided');
      }

      logger.info(`Found ${validPostIds.length} valid post IDs out of ${post_ids.length}`);
      
      // ✅ CORRECTION : Récupérer les posts avec gestion d'erreur améliorée
      const { data: posts, error: fetchError } = await supabaseClient
        .from('linkedin_posts')
        .select('*')
        .in('id', validPostIds);

      if (fetchError) {
        logger.error(`Failed to fetch posts: ${fetchError.message}`, fetchError);
        throw new Error(`Failed to fetch posts: ${fetchError.message}`);
      }

      if (!posts || posts.length === 0) {
        logger.error('No posts found with provided IDs', { 
          valid_ids_count: validPostIds.length,
          sample_ids: validPostIds.slice(0, 3),
          dataset_id: cleanDatasetId
        });
        throw new Error(`No posts found with provided IDs`);
      }

      logger.info(`Successfully fetched ${posts.length} posts from database`);

      const results = await processBatch(posts, supabaseClient, cleanDatasetId, correlationId);
      
      logger.success(`Batch completed: ${results.successCount} success, ${results.errorCount} errors`);

      return new Response(JSON.stringify({ 
        success: true,
        correlation_id: correlationId,
        processed_count: posts.length,
        success_count: results.successCount,
        error_count: results.errorCount,
        step: 'step1',
        validation_summary: {
          total_ids_received: post_ids.length,
          valid_ids: validPostIds.length,
          invalid_ids: invalidPostIds.length,
          posts_found: posts.length
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Mode single post
    if (post_id) {
      const correlationId = CorrelationLogger.generateCorrelationId();
      
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

      const result = await processSinglePost(post, supabaseClient, cleanDatasetId, correlationId);

      return new Response(JSON.stringify({ 
        success: true,
        correlation_id: correlationId,
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

async function processSinglePost(
  post: any, 
  supabaseClient: any, 
  datasetId?: string,
  correlationId?: string
) {
  const corrId = correlationId || CorrelationLogger.generateCorrelationId();
  const logger = new CorrelationLogger({
    correlationId: corrId,
    postId: post.id,
    step: 'step1',
    datasetId
  }, supabaseClient);

  const startTime = Date.now();
  
  try {
    await logger.logStepStart({ author: post.author_name, title: post.title?.substring(0, 50) });
    
    const { result, fullResponse } = await callOpenAIStep1(post);
    const { normalizedResponse } = await updatePostStep1Results(supabaseClient, post.id, result, fullResponse, corrId);
    
    const duration = Date.now() - startTime;
    await logger.logStepEnd(result, duration);
    
    // 🔥 NOUVEAU : Déclenchement immédiat du Step 2 si succès
    if (normalizedResponse === 'oui') {
      console.log(`✅ Step 1 passed for post ${post.id}, triggering Step 2 IMMEDIATELY`);
      try {
        await supabaseClient.functions.invoke('openai-step2-worker', {
          body: { 
            post_id: post.id,
            dataset_id: datasetId || null,
            workflow_trigger: true
          }
        });
        console.log(`🎯 Step 2 triggered immediately for post ${post.id}`);
      } catch (error) {
        console.error(`❌ Error triggering Step 2 for post ${post.id}:`, error);
      }
    } else {
      console.log(`❌ Step 1 failed for post ${post.id}, marking as not_job_posting`);
      await supabaseClient
        .from('linkedin_posts')
        .update({ processing_status: 'not_job_posting' })
        .eq('id', post.id);
    }
    
    return { post_id: post.id, success: true, analysis: result, correlation_id: corrId };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    await logger.logStepError(error, duration);
    await handleWorkerError(supabaseClient, post.id, corrId, 'step1', error);
    throw error;
  }
}

async function processBatch(
  posts: any[], 
  supabaseClient: any, 
  datasetId?: string,
  batchCorrelationId: string
) {
  let successCount = 0;
  let errorCount = 0;
  const CONCURRENT_LIMIT = 5;
  
  for (let i = 0; i < posts.length; i += CONCURRENT_LIMIT) {
    const batch = posts.slice(i, i + CONCURRENT_LIMIT);
    
    const promises = batch.map(async (post) => {
      try {
        const postCorrelationId = `${batchCorrelationId}_${post.id}`;
        await processSinglePost(post, supabaseClient, datasetId, postCorrelationId);
        successCount++;
      } catch (error) {
        errorCount++;
      }
    });

    await Promise.allSettled(promises);
    
    if (i + CONCURRENT_LIMIT < posts.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return { successCount, errorCount };
}

async function callOpenAIStep1(post: any) {
  logger.info('Calling OpenAI Step 1 API');
  
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
* Est écrit par quelqu'un **à la recherche d'un emploi** (ex : "je cherche un CDI").
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
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
    logger.error('Invalid OpenAI response structure', data);
    throw new Error('Invalid OpenAI response');
  }
  
  let result;
  try {
    result = JSON.parse(data.choices[0].message.content);
  } catch (parseError) {
    logger.error('Failed to parse OpenAI JSON response', data.choices[0].message.content);
    throw new Error('Failed to parse OpenAI response as JSON');
  }
  
  logger.success('OpenAI Step 1 API call completed', { 
    recrute_poste: result.recrute_poste,
    postes_count: result.postes?.split(',')?.length || 0
  });
  
  return { result, fullResponse: data };
}

async function updatePostStep1Results(supabaseClient: any, postId: string, result: any, fullResponse: any, correlationId: string) {
  const normalizedResponse = result.recrute_poste?.toLowerCase() === 'oui' ? 'oui' : 'non';
  const newStatus = normalizedResponse === 'oui' ? 'processing' : 'not_job_posting';

  await updatePostWithCorrelation(supabaseClient, postId, correlationId, {
    openai_step1_recrute_poste: normalizedResponse,
    openai_step1_postes: result.postes,
    openai_step1_response: fullResponse,
    processing_status: newStatus
  });

  return { normalizedResponse, newStatus };
}

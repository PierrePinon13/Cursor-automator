import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CorrelationLogger, updatePostWithCorrelation, handleWorkerError } from '../shared/correlation-logger.ts'

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
    console.log('🤖 OpenAI Step 3 Worker started');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      post_id, 
      dataset_id, 
      batch_mode = false,
      workflow_trigger = false
    } = await req.json();

    if (batch_mode) {
      return await processBatchStep3(supabaseClient, dataset_id);
    } else if (post_id) {
      return await processSingleStep3(supabaseClient, post_id, dataset_id, workflow_trigger);
    } else {
      throw new Error('Either post_id or batch_mode must be provided');
    }

  } catch (error) {
    console.error('❌ Error in openai-step3-worker:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processSingleStep3(supabaseClient: any, postId: string, datasetId?: string, workflowTrigger = false) {
  const correlationId = CorrelationLogger.generateCorrelationId();
  const logger = new CorrelationLogger({
    correlationId,
    postId,
    step: 'step3',
    datasetId
  });

  const startTime = Date.now();
  
  try {
    await logger.logStepStart();
    
    // Récupérer le post
    const { data: post, error: postError } = await supabaseClient
      .from('linkedin_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      throw new Error(`Post not found: ${postId}`);
    }

    // Vérifier que Step 2 a été validé
    if (post.openai_step2_reponse !== 'oui') {
      logger.warn('Skipping Step 3 - Step 2 not validated');
      return new Response(JSON.stringify({
        success: false,
        reason: 'Step 2 not validated',
        post_id: postId,
        correlation_id: correlationId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Appel OpenAI Step 3
    logger.info('Calling OpenAI Step 3 API');
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
            content: `### 💼 CONTEXTE

Vous analysez une **offre d'emploi validée** pour la **catégoriser** et **sélectionner les postes** les plus pertinents.

---

### 🎯 OBJECTIF

Retourner un objet JSON avec les champs suivants :

\`\`\`json
{
  "categorie": "Développeur" | "Data" | "IA/ML" | "Sécurité" | "DevOps/Infra" | "Product/UX" | "RH/Admin" | "Direction" | "Autre",
  "postes_selectionnes": ["poste1", "poste2", "poste3"],
  "justification": "explication courte du choix de catégorie"
}
\`\`\`

---

### 📋 CATÉGORIES DISPONIBLES

1. **"Développeur"** : Développement logiciel (web, mobile, backend, frontend, fullstack)
2. **"Data"** : Data science, data analyst, data engineer, business intelligence
3. **"IA/ML"** : Intelligence artificielle, machine learning, deep learning
4. **"Sécurité"** : Cybersécurité, sécurité informatique, pentesting, RSSI
5. **"DevOps/Infra"** : DevOps, infrastructure, cloud, système, réseau
6. **"Product/UX"** : Product manager, UX/UI designer, chef de produit
7. **"RH/Admin"** : Ressources humaines, administration, finance, juridique
8. **"Direction"** : CTO, CEO, directeur technique, lead technique
9. **"Autre"** : Tous les autres postes (commerciaux, marketing, etc.)

---

### 🔍 SÉLECTION DES POSTES

- Extraire **jusqu'à 3 postes** les plus pertinents mentionnés dans l'offre
- Privilégier les postes **techniques et qualifiés**
- Ignorer les postes trop juniors (stagiaires, alternants, assistants)
- Reformuler en termes standards si nécessaire

---

### ⚠️ RÈGLES IMPORTANTES

- Si **aucun poste technique** n'est mentionné clairement → **"Autre"**
- Si **plus de 3 postes différents** → sélectionner les 3 plus pertinents
- Privilégier la **catégorie dominante** si plusieurs sont présentes`
          },
          {
            role: 'user',
            content: `Analysez cette offre d'emploi :

**Titre :** ${post.title || 'Aucun titre'}

**Contenu :** ${post.text}

**Postes identifiés précédemment :** ${post.openai_step1_postes || 'Aucun'}`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      }),
    });

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    // Sauvegarder les résultats
    await updatePostWithCorrelation(supabaseClient, postId, correlationId, {
      openai_step3_categorie: result.categorie,
      openai_step3_postes_selectionnes: result.postes_selectionnes,
      openai_step3_justification: result.justification,
      openai_step3_response: data
    });

    const duration = Date.now() - startTime;
    await logger.logStepEnd(result, duration);

    // Déclencher l'étape suivante si c'est un workflow (simplifié)
    if (workflowTrigger) {
      try {
        await supabaseClient.functions.invoke('specialized-unipile-worker', {
          body: { 
            post_id: postId,
            dataset_id: datasetId,
            workflow_trigger: true
          }
        });
        logger.success('Step 4 (Unipile) triggered');
      } catch (error) {
        logger.error('Error triggering Step 4', error);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      result: result,
      post_id: postId,
      dataset_id: datasetId,
      correlation_id: correlationId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    await logger.logStepError(error, duration);
    await handleWorkerError(supabaseClient, postId, correlationId, 'step3', error);

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      post_id: postId,
      correlation_id: correlationId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function processBatchStep3(supabaseClient: any, datasetId?: string) {
  const correlationId = CorrelationLogger.generateCorrelationId();
  const logger = new CorrelationLogger({
    correlationId,
    postId: 'BATCH',
    step: 'step3_batch',
    datasetId
  });

  logger.info(`Processing Step 3 batch for dataset: ${datasetId}`);
  
  let query = supabaseClient
    .from('linkedin_posts')
    .select('*')
    .eq('openai_step2_reponse', 'oui')
    .is('openai_step3_categorie', null)
    .limit(50);

  if (datasetId) {
    query = query.eq('apify_dataset_id', datasetId);
  }

  const { data: posts, error } = await query;

  if (error) {
    throw new Error(`Error fetching posts for Step 3: ${error.message}`);
  }

  logger.info(`Found ${posts.length} posts for Step 3 processing`);

  let processed = 0;
  let errors = 0;

  // Traiter en parallèle avec limite
  const PARALLEL_LIMIT = 5;
  
  for (let i = 0; i < posts.length; i += PARALLEL_LIMIT) {
    const batch = posts.slice(i, i + PARALLEL_LIMIT);
    
    await Promise.all(batch.map(async (post) => {
      try {
        await processSingleStep3(supabaseClient, post.id, post.apify_dataset_id, false);
        processed++;
      } catch (error) {
        logger.error(`Error processing Step 3 for post ${post.id}`, error);
        errors++;
      }
    }));
    
    // Petit délai entre les batches
    if (i + PARALLEL_LIMIT < posts.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return new Response(JSON.stringify({
    success: true,
    batch_mode: true,
    dataset_id: datasetId,
    processed_count: processed,
    error_count: errors,
    total_found: posts.length,
    correlation_id: correlationId
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}


import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { orchestrateWorkflow } from '../processing-queue-manager/workflow-orchestrator.ts'

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
    console.log('🤖 OpenAI Step 2 Worker started');
    
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
      return await processBatchStep2(supabaseClient, dataset_id);
    } else if (post_id) {
      return await processSingleStep2(supabaseClient, post_id, dataset_id, workflow_trigger);
    } else {
      throw new Error('Either post_id or batch_mode must be provided');
    }

  } catch (error) {
    console.error('❌ Error in openai-step2-worker:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processSingleStep2(supabaseClient: any, postId: string, datasetId?: string, workflowTrigger = false) {
  console.log(`🤖 Processing Step 2 for post: ${postId}, dataset: ${datasetId}`);
  
  try {
    // Récupérer le post
    const { data: post, error: postError } = await supabaseClient
      .from('linkedin_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      throw new Error(`Post not found: ${postId}`);
    }

    // Vérifier que Step 1 a été validé
    if (post.openai_step1_recrute_poste !== 'oui') {
      console.log(`⚠️ Skipping Step 2 for post ${postId} - Step 1 not validated`);
      return new Response(JSON.stringify({
        success: false,
        reason: 'Step 1 not validated',
        post_id: postId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Appel OpenAI Step 2
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
            content: `### 🌍 CONTEXTE

Vous analysez un post LinkedIn d'**offre d'emploi confirmée** pour vérifier si elle correspond aux critères géographiques et linguistiques.

---

### 🎯 OBJECTIF

Retourner un objet JSON avec les champs suivants :

\`\`\`json
{
  "reponse": "Oui" | "Non",
  "langue": "Français" | "Anglais" | "Autre",
  "localisation_detectee": "description de la localisation",
  "raison": "explication courte de la décision"
}
\`\`\`

---

### ✅ CLASSER "Oui" SI :

L'offre respecte **TOUS** ces critères :

1. **LANGUE** : Rédigée en français OU en anglais
2. **GÉOGRAPHIE** : 
   - Poste basé en **France**, **Belgique**, **Suisse**, **Luxembourg**, **Monaco** ou **Canada**
   - OU poste en **remote** (télétravail) depuis ces pays
   - OU entreprise basée dans ces pays (même si localisation pas précisée)

---

### ❌ CLASSER "Non" SI :

- Langue autre que français/anglais
- Localisation dans un autre pays
- Remote mais avec restriction géographique hors de nos zones
- Aucune indication géographique ET entreprise manifestement étrangère

---

### 📍 DÉTECTION GÉOGRAPHIQUE

Cherchez les indices de localisation :
- Mentions explicites de villes/pays
- Codes postaux français/belges/suisses
- Entreprises connues de ces régions
- Termes comme "télétravail France", "remote EU", etc.`
          },
          {
            role: 'user',
            content: `Analysez cette offre d'emploi LinkedIn :

**Titre :** ${post.title || 'Aucun titre'}

**Contenu :** ${post.text}

**Auteur :** ${post.author_name}

**URL de l'auteur :** ${post.author_profile_url}`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      }),
    });

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    // Normaliser la réponse
    const normalizedResponse = result.reponse?.toLowerCase() === 'oui' ? 'oui' : 'non';

    // Sauvegarder les résultats
    await supabaseClient
      .from('linkedin_posts')
      .update({
        openai_step2_reponse: normalizedResponse,
        openai_step2_langue: result.langue,
        openai_step2_localisation: result.localisation_detectee,
        openai_step2_raison: result.raison,
        openai_step2_response: data,
        last_updated_at: new Date().toISOString()
      })
      .eq('id', postId);

    console.log(`✅ Step 2 completed for post: ${postId} - ${normalizedResponse}`);

    // Déclencher l'étape suivante si c'est un workflow
    if (workflowTrigger) {
      await orchestrateWorkflow(supabaseClient, postId, 'step2_completed', result, datasetId);
    }

    return new Response(JSON.stringify({
      success: true,
      result: result,
      post_id: postId,
      dataset_id: datasetId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(`❌ Error processing Step 2 for post ${postId}:`, error);
    
    await supabaseClient
      .from('linkedin_posts')
      .update({
        processing_status: 'error',
        retry_count: supabaseClient.rpc('increment', { x: 1 }),
        last_retry_at: new Date().toISOString(),
        last_updated_at: new Date().toISOString()
      })
      .eq('id', postId);

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      post_id: postId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function processBatchStep2(supabaseClient: any, datasetId?: string) {
  console.log(`🤖 Processing Step 2 batch for dataset: ${datasetId}`);
  
  let query = supabaseClient
    .from('linkedin_posts')
    .select('*')
    .eq('openai_step1_recrute_poste', 'oui')
    .is('openai_step2_reponse', null)
    .limit(50);

  if (datasetId) {
    query = query.eq('apify_dataset_id', datasetId);
  }

  const { data: posts, error } = await query;

  if (error) {
    throw new Error(`Error fetching posts for Step 2: ${error.message}`);
  }

  console.log(`📊 Found ${posts.length} posts for Step 2 processing`);

  let processed = 0;
  let errors = 0;

  // Traiter en parallèle avec limite
  const PARALLEL_LIMIT = 5;
  
  for (let i = 0; i < posts.length; i += PARALLEL_LIMIT) {
    const batch = posts.slice(i, i + PARALLEL_LIMIT);
    
    await Promise.all(batch.map(async (post) => {
      try {
        await processSingleStep2(supabaseClient, post.id, post.apify_dataset_id, false);
        processed++;
      } catch (error) {
        console.error(`❌ Error processing Step 2 for post ${post.id}:`, error);
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
    total_found: posts.length
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

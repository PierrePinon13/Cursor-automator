
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
    console.log('🤖 Specialized OpenAI Worker started');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { post_id, dataset_id, step = 'step1' } = await req.json();
    
    if (!post_id) {
      throw new Error('Post ID is required');
    }

    console.log(`🎯 Processing OpenAI ${step} for post: ${post_id} (dataset: ${dataset_id})`);

    // Récupérer le post
    const { data: post, error: fetchError } = await supabaseClient
      .from('linkedin_posts')
      .select('*')
      .eq('id', post_id)
      .single();

    if (fetchError || !post) {
      throw new Error(`Post not found: ${post_id}`);
    }

    // Marquer comme en traitement
    await supabaseClient
      .from('linkedin_posts')
      .update({ processing_status: 'processing' })
      .eq('id', post_id);

    let result;
    try {
      switch (step) {
        case 'step1':
          result = await executeOpenAIStep1(post, supabaseClient);
          break;
        case 'step2':
          result = await executeOpenAIStep2(post, supabaseClient);
          break;
        case 'step3':
          result = await executeOpenAIStep3(post, supabaseClient);
          break;
        default:
          throw new Error(`Unknown step: ${step}`);
      }

      console.log(`✅ OpenAI ${step} completed for post: ${post_id}`);
      
      // Déclencher l'étape suivante si nécessaire
      await triggerNextStep(supabaseClient, post, step, result);

    } catch (error) {
      console.error(`❌ OpenAI ${step} failed for post ${post_id}:`, error);
      await handleOpenAIError(supabaseClient, post_id, step, error);
      throw error;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      post_id,
      step,
      result,
      dataset_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in specialized-openai-worker:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function executeOpenAIStep1(post: any, supabaseClient: any) {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Récupérer le prompt depuis la base
  const { data: promptData } = await supabaseClient
    .from('openai_prompts')
    .select('prompt')
    .eq('step', 1)
    .single();

  const prompt = promptData?.prompt || `Analysez ce post LinkedIn et déterminez s'il s'agit d'un recrutement.

Post: "${post.text}"
Titre: "${post.title || 'N/A'}"
Auteur: ${post.author_name}
Type d'auteur: ${post.author_type}

Répondez en JSON avec:
{
  "recrute_poste": "oui" ou "non",
  "postes": "description des postes si oui, sinon vide"
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
        { role: 'system', content: 'Tu es un expert en analyse de posts de recrutement LinkedIn.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 500
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  let result;
  
  try {
    result = JSON.parse(data.choices[0].message.content);
  } catch (parseError) {
    console.error('Failed to parse OpenAI response, using fallback');
    const content = data.choices[0].message.content.toLowerCase();
    result = {
      recrute_poste: content.includes('oui') ? 'oui' : 'non',
      postes: content.includes('oui') ? 'Poste de recrutement détecté' : ''
    };
  }

  // Sauvegarder les résultats
  await supabaseClient
    .from('linkedin_posts')
    .update({
      openai_step1_recrute_poste: result.recrute_poste,
      openai_step1_postes: result.postes,
      openai_step1_response: data
    })
    .eq('id', post.id);

  return result;
}

async function executeOpenAIStep2(post: any, supabaseClient: any) {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const { data: promptData } = await supabaseClient
    .from('openai_prompts')
    .select('prompt')
    .eq('step', 2)
    .single();

  const prompt = promptData?.prompt || `Analysez ce post de recrutement pour la langue et la localisation.

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
        { role: 'system', content: 'Tu es un expert en analyse linguistique et géographique.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 300
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  let result;
  
  try {
    result = JSON.parse(data.choices[0].message.content);
  } catch (parseError) {
    const content = data.choices[0].message.content.toLowerCase();
    result = {
      reponse: content.includes('oui') ? 'oui' : 'non',
      langue: 'français',
      localisation_detectee: 'non spécifiée',
      raison: content.includes('non') ? 'Critères non remplis' : ''
    };
  }

  await supabaseClient
    .from('linkedin_posts')
    .update({
      openai_step2_reponse: result.reponse,
      openai_step2_langue: result.langue,
      openai_step2_localisation: result.localisation_detectee,
      openai_step2_raison: result.raison,
      openai_step2_response: data
    })
    .eq('id', post.id);

  return result;
}

async function executeOpenAIStep3(post: any, supabaseClient: any) {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const { data: promptData } = await supabaseClient
    .from('openai_prompts')
    .select('prompt')
    .eq('step', 3)
    .single();

  const prompt = promptData?.prompt || `Catégorisez ce post de recrutement et sélectionnez les postes pertinents.

Post: "${post.text}"
Postes détectés: "${post.openai_step1_postes}"

Catégories disponibles: IT, Finance, Marketing, Commercial, RH, Autre

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
        { role: 'system', content: 'Tu es un expert en catégorisation d\'offres d\'emploi.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 400
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  let result;
  
  try {
    result = JSON.parse(data.choices[0].message.content);
  } catch (parseError) {
    result = {
      categorie: 'Autre',
      postes_selectionnes: [post.openai_step1_postes || 'Poste non spécifié'],
      justification: 'Catégorisation automatique par défaut'
    };
  }

  await supabaseClient
    .from('linkedin_posts')
    .update({
      openai_step3_categorie: result.categorie,
      openai_step3_postes_selectionnes: result.postes_selectionnes,
      openai_step3_justification: result.justification,
      openai_step3_response: data
    })
    .eq('id', post.id);

  return result;
}

async function triggerNextStep(supabaseClient: any, post: any, currentStep: string, result: any) {
  console.log(`🔄 Triggering next step after ${currentStep}...`);
  
  switch (currentStep) {
    case 'step1':
      if (result.recrute_poste === 'oui') {
        // Déclencher Step 2
        supabaseClient.functions.invoke('specialized-openai-worker', {
          body: { 
            post_id: post.id, 
            dataset_id: post.apify_dataset_id,
            step: 'step2'
          }
        }).catch((err: any) => console.error('Error triggering step2:', err));
      } else {
        // Marquer comme non pertinent
        await supabaseClient
          .from('linkedin_posts')
          .update({ processing_status: 'not_job_posting' })
          .eq('id', post.id);
      }
      break;
      
    case 'step2':
      if (result.reponse === 'oui') {
        // Déclencher Step 3
        supabaseClient.functions.invoke('specialized-openai-worker', {
          body: { 
            post_id: post.id, 
            dataset_id: post.apify_dataset_id,
            step: 'step3'
          }
        }).catch((err: any) => console.error('Error triggering step3:', err));
      } else {
        // Marquer comme filtré
        await supabaseClient
          .from('linkedin_posts')
          .update({ processing_status: 'filtered_out' })
          .eq('id', post.id);
      }
      break;
      
    case 'step3':
      // Déclencher le scraping Unipile
      supabaseClient.functions.invoke('specialized-unipile-worker', {
        body: { 
          post_id: post.id, 
          dataset_id: post.apify_dataset_id
        }
      }).catch((err: any) => console.error('Error triggering unipile worker:', err));
      break;
  }
}

async function handleOpenAIError(supabaseClient: any, postId: string, step: string, error: any) {
  let errorType = 'temporary_error';
  
  if (error.message.includes('429')) {
    errorType = 'openai_rate_limit';
  } else if (error.message.includes('timeout')) {
    errorType = 'openai_timeout';
  } else if (error.message.includes('400') || error.message.includes('401')) {
    errorType = 'permanent_error';
  }

  const retryConfig = {
    openai_rate_limit: { delay: 60000, max_retries: 5 },
    openai_timeout: { delay: 30000, max_retries: 3 },
    temporary_error: { delay: 60000, max_retries: 3 },
    permanent_error: { delay: 0, max_retries: 0 }
  };

  const config = retryConfig[errorType as keyof typeof retryConfig];
  
  await supabaseClient
    .from('linkedin_posts')
    .update({
      processing_status: config.max_retries > 0 ? 'retry_scheduled' : 'error',
      retry_count: supabaseClient.rpc('increment', { x: 1 }),
      last_retry_at: new Date().toISOString()
    })
    .eq('id', postId);
}

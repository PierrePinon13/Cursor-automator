
import { callOpenAI, parseOpenAIResponse } from './openai-client.ts';

export interface BatchProcessingResult {
  success: number;
  failed: number;
  results: Array<{
    post_id: string;
    success: boolean;
    result?: any;
    error?: string;
  }>;
}

export async function processBatchOpenAIStep1(posts: any[], supabaseClient: any): Promise<BatchProcessingResult> {
  console.log(`🔄 Processing OpenAI Step 1 batch: ${posts.length} posts`);
  
  const results: BatchProcessingResult = {
    success: 0,
    failed: 0,
    results: []
  };

  // Traitement en parallèle avec limite de concurrence
  const CONCURRENT_LIMIT = 5;
  const batches = [];
  
  for (let i = 0; i < posts.length; i += CONCURRENT_LIMIT) {
    batches.push(posts.slice(i, i + CONCURRENT_LIMIT));
  }

  for (const batch of batches) {
    const promises = batch.map(async (post) => {
      try {
        console.log(`🤖 Processing Step 1 for post: ${post.id}`);
        
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

        const data = await callOpenAI(
          prompt, 
          'Tu es un expert en analyse de posts de recrutement LinkedIn.',
          0.1,
          500
        );

        const result = parseOpenAIResponse(data, (content: string) => {
          const lowerContent = content.toLowerCase();
          return {
            recrute_poste: lowerContent.includes('oui') ? 'oui' : 'non',
            postes: lowerContent.includes('oui') ? 'Poste de recrutement détecté' : ''
          };
        });

        // Sauvegarder les résultats
        await supabaseClient
          .from('linkedin_posts')
          .update({
            openai_step1_recrute_poste: result.recrute_poste,
            openai_step1_postes: result.postes,
            openai_step1_response: data
          })
          .eq('id', post.id);

        results.success++;
        results.results.push({
          post_id: post.id,
          success: true,
          result
        });

        console.log(`✅ Step 1 completed for post: ${post.id}`);
        return { post_id: post.id, success: true, result };

      } catch (error) {
        console.error(`❌ Step 1 failed for post ${post.id}:`, error);
        results.failed++;
        results.results.push({
          post_id: post.id,
          success: false,
          error: error.message
        });
        return { post_id: post.id, success: false, error: error.message };
      }
    });

    // Attendre le batch avec timeout
    await Promise.allSettled(promises);
    
    // Pause courte entre les batches pour respecter les rate limits
    if (batches.indexOf(batch) < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`📊 Batch Step 1 summary: ${results.success} success, ${results.failed} failed`);
  return results;
}

export async function processBatchOpenAIStep2(posts: any[], supabaseClient: any): Promise<BatchProcessingResult> {
  console.log(`🔄 Processing OpenAI Step 2 batch: ${posts.length} posts`);
  
  const results: BatchProcessingResult = {
    success: 0,
    failed: 0,
    results: []
  };

  const CONCURRENT_LIMIT = 5;
  const batches = [];
  
  for (let i = 0; i < posts.length; i += CONCURRENT_LIMIT) {
    batches.push(posts.slice(i, i + CONCURRENT_LIMIT));
  }

  for (const batch of batches) {
    const promises = batch.map(async (post) => {
      try {
        console.log(`🌍 Processing Step 2 for post: ${post.id}`);
        
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

        const data = await callOpenAI(
          prompt,
          'Tu es un expert en analyse linguistique et géographique.',
          0.1,
          300
        );

        const result = parseOpenAIResponse(data, (content: string) => {
          const lowerContent = content.toLowerCase();
          return {
            reponse: lowerContent.includes('oui') ? 'oui' : 'non',
            langue: 'français',
            localisation_detectee: 'non spécifiée',
            raison: lowerContent.includes('non') ? 'Critères non remplis' : ''
          };
        });

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

        results.success++;
        results.results.push({
          post_id: post.id,
          success: true,
          result
        });

        console.log(`✅ Step 2 completed for post: ${post.id}`);
        return { post_id: post.id, success: true, result };

      } catch (error) {
        console.error(`❌ Step 2 failed for post ${post.id}:`, error);
        results.failed++;
        results.results.push({
          post_id: post.id,
          success: false,
          error: error.message
        });
        return { post_id: post.id, success: false, error: error.message };
      }
    });

    await Promise.allSettled(promises);
    
    if (batches.indexOf(batch) < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`📊 Batch Step 2 summary: ${results.success} success, ${results.failed} failed`);
  return results;
}

export async function processBatchOpenAIStep3(posts: any[], supabaseClient: any): Promise<BatchProcessingResult> {
  console.log(`🔄 Processing OpenAI Step 3 batch: ${posts.length} posts`);
  
  const results: BatchProcessingResult = {
    success: 0,
    failed: 0,
    results: []
  };

  const CONCURRENT_LIMIT = 5;
  const batches = [];
  
  for (let i = 0; i < posts.length; i += CONCURRENT_LIMIT) {
    batches.push(posts.slice(i, i + CONCURRENT_LIMIT));
  }

  for (const batch of batches) {
    const promises = batch.map(async (post) => {
      try {
        console.log(`🏷️ Processing Step 3 for post: ${post.id}`);
        
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

        const data = await callOpenAI(
          prompt,
          'Tu es un expert en catégorisation d\'offres d\'emploi.',
          0.1,
          400
        );

        const result = parseOpenAIResponse(data, () => ({
          categorie: 'Autre',
          postes_selectionnes: [post.openai_step1_postes || 'Poste non spécifié'],
          justification: 'Catégorisation automatique par défaut'
        }));

        await supabaseClient
          .from('linkedin_posts')
          .update({
            openai_step3_categorie: result.categorie,
            openai_step3_postes_selectionnes: result.postes_selectionnes,
            openai_step3_justification: result.justification,
            openai_step3_response: data
          })
          .eq('id', post.id);

        results.success++;
        results.results.push({
          post_id: post.id,
          success: true,
          result
        });

        console.log(`✅ Step 3 completed for post: ${post.id}`);
        return { post_id: post.id, success: true, result };

      } catch (error) {
        console.error(`❌ Step 3 failed for post ${post.id}:`, error);
        results.failed++;
        results.results.push({
          post_id: post.id,
          success: false,
          error: error.message
        });
        return { post_id: post.id, success: false, error: error.message };
      }
    });

    await Promise.allSettled(promises);
    
    if (batches.indexOf(batch) < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`📊 Batch Step 3 summary: ${results.success} success, ${results.failed} failed`);
  return results;
}

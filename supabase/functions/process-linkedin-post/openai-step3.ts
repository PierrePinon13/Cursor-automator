
import { JOB_CATEGORIES_PROMPT } from './job-categories.ts';
import type { OpenAIStep1Result } from './openai-step1.ts';

export interface OpenAIStep3Result {
  categorie: string;
  postes_selectionnes: string[];
  justification: string;
}

export async function executeStep3(openAIApiKey: string, post: any, step1Result: OpenAIStep1Result): Promise<{ result: OpenAIStep3Result; data: any }> {
  console.log('Starting OpenAI Step 3: Position categorization');
  
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
          content: JOB_CATEGORIES_PROMPT
        },
        {
          role: 'user',
          content: `# CONTEXT

Vous êtes un assistant spécialisé dans l'analyse des publications LinkedIn pour l'équipe commerciale d'un cabinet de recrutement. Votre mission est d'examiner une publication LinkedIn, en vous concentrant principalement sur les **postes mentionnés par l'utilisateur**, afin de classer ces postes dans **une seule catégorie d'offre** et de normaliser les titres associés.

# OBJECTIVE

Analyser la publication LinkedIn et les postes fournis par l'utilisateur pour :

1. Sélectionner **une seule** catégorie parmi les 9 proposées.
2. Identifier les postes fournis qui relèvent de cette catégorie.
3. Les normaliser selon les règles fournies.

# INSTRUCTIONS

1. Analysez les postes indiqués par l'utilisateur dans la section suivante :

${step1Result.postes}

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

# PUBLICATION LINKEDIN À ANALYSER

\`\`\`text
${post.title || ''}
${post.text}
\`\`\`

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
        }
      ],
      response_format: { type: 'json_object' }
    }),
  });

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);
  
  console.log('Step 3 result:', result);
  return { result, data };
}

export async function executeOpenAIStep3(context: any, step1Result: OpenAIStep1Result): Promise<{ result: OpenAIStep3Result; data: any }> {
  try {
    console.log('🏷️ Step 3: OpenAI job categorization starting...');
    console.log('📝 Post ID:', context.postId);
    console.log('📋 Step 1 positions:', step1Result.postes);
    
    const response = await executeStep3(context.openAIApiKey, context.post, step1Result);
    
    // Update the post with step 3 results
    const { error: updateError } = await context.supabaseClient
      .from('linkedin_posts')
      .update({
        openai_step3_categorie: response.result.categorie,
        openai_step3_postes_selectionnes: response.result.postes_selectionnes,
        openai_step3_justification: response.result.justification,
        openai_step3_response: response.data
      })
      .eq('id', context.postId);

    if (updateError) {
      console.error('❌ Error updating post with step 3 results:', updateError);
      throw updateError;
    }

    console.log('✅ Step 3 completed and saved:', response.result);
    return response;

  } catch (error: any) {
    console.error('❌ Error in OpenAI Step 3 execution:', error);
    throw error;
  }
}

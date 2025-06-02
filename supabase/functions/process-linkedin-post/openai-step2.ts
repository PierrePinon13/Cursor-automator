
export interface OpenAIStep2Result {
  reponse: string;
  langue: string;
  localisation_detectee: string;
  raison: string;
}

export async function executeStep2(openAIApiKey: string, post: any): Promise<{ result: OpenAIStep2Result; data: any }> {
  console.log('Starting OpenAI Step 2: France location check');
  
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
          content: `${post.title || ''}\n${post.text}`
        }
      ],
      response_format: { type: 'json_object' }
    }),
  });

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);
  
  console.log('Step 2 result:', result);
  return { result, data };
}

export async function executeOpenAIStep2(context: any): Promise<{ result: OpenAIStep2Result; data: any }> {
  try {
    console.log('🌍 Step 2: OpenAI language/location analysis starting...');
    console.log('📝 Post ID:', context.postId);
    
    const response = await executeStep2(context.openAIApiKey, context.post);
    
    // Update the post with step 2 results
    const { error: updateError } = await context.supabaseClient
      .from('linkedin_posts')
      .update({
        openai_step2_reponse: response.result.reponse,
        openai_step2_langue: response.result.langue,
        openai_step2_localisation: response.result.localisation_detectee,
        openai_step2_raison: response.result.raison,
        openai_step2_response: response.data
      })
      .eq('id', context.postId);

    if (updateError) {
      console.error('❌ Error updating post with step 2 results:', updateError);
      throw updateError;
    }

    console.log('✅ Step 2 completed and saved:', response.result);
    return response;

  } catch (error: any) {
    console.error('❌ Error in OpenAI Step 2 execution:', error);
    throw error;
  }
}

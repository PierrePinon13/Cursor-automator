
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

export async function callOpenAIStep2(post: any) {
  const systemPrompt = `# CONTEXTE
Vous êtes un assistant spécialisé dans l'analyse des publications LinkedIn pour un cabinet de recrutement. Votre mission est d'examiner un post LinkedIn dans lequel un auteur indique chercher à recruter un profil spécifique, afin de déterminer si le poste est situé en France, Belgique, Suisse, Monaco ou Luxembourg.

# OBJECTIF
Analyser le texte du post LinkedIn pour classer le recrutement comme "Oui" ou "Non" selon les critères définis ci-dessous, **et fournir une explication structurée du raisonnement**.

# INSTRUCTIONS
1. Examinez le contenu du post LinkedIn pour identifier la **langue du texte** et les **mentions de localisation**.
2. Répondez **"Oui"** si :
   - Le post mentionne clairement une localisation en **France, Belgique, Suisse, Luxembourg ou Monaco**.
   - Ou si le post est rédigé en **français** et **aucun indice ne suggère que le poste est situé hors de cette zone** (même si aucune localisation explicite n'est donnée).
3. Répondez **"Non"** si :
   - Une localisation est clairement mentionnée **hors de la zone cible** (ex : Canada, Allemagne, Maroc…).
   - Ou si le post **n'est pas rédigé en français** et **n'indique pas clairement** que le poste se situe dans la zone cible.

En cas de doute sur la localisation ou la langue : **répondez "Non"**.

# FORMAT DE SORTIE
La réponse doit être fournie dans le format suivant (JSON) :

\`\`\`json
{
  "reponse": "Oui" ou "Non",
  "langue": "français" ou autre (ex : "anglais"),
  "localisation_detectee": "texte extrait indiquant une localisation, s'il y en a, sinon null",
  "raison": "explication courte justifiant la réponse (ex : 'Post en français sans mention hors zone', 'Localisation indiquée : Berlin, hors zone', etc.)"
}
\`\`\``;

  const userPrompt = `Analysez ce post LinkedIn :

Titre : ${post.title || 'Aucun titre'}

Contenu : ${post.text}

Postes identifiés à l'étape 1 : ${post.openai_step1_postes || 'Non spécifiés'}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    result: JSON.parse(data.choices[0].message.content),
    fullResponse: data
  };
}


export interface OpenAIStep1Result {
  recrute_poste: string;
  postes: string;
}

export async function executeStep1(openAIApiKey: string, post: any): Promise<{ result: OpenAIStep1Result; data: any }> {
  console.log('Starting OpenAI Step 1: Recruitment detection');
  console.log('Post details for analysis:', {
    title: post.title,
    textPreview: (post.text || '').substring(0, 200),
    author: post.author_name
  });
  
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
    console.error('❌ Invalid OpenAI response structure:', data);
    throw new Error('Invalid OpenAI response');
  }
  
  let result;
  try {
    result = JSON.parse(data.choices[0].message.content);
  } catch (parseError) {
    console.error('❌ Failed to parse OpenAI JSON response:', data.choices[0].message.content);
    throw new Error('Failed to parse OpenAI response as JSON');
  }
  
  console.log('✅ Step 1 result parsed successfully:', result);
  console.log('📊 Full OpenAI response data:', {
    usage: data.usage,
    model: data.model,
    choices_length: data.choices?.length
  });
  
  return { result, data };
}

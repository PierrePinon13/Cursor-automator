
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

export async function callOpenAIStep1(post: any) {
  const systemPrompt = `### 🔍 CONTEXTE

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
* Est écrit par quelqu'un **à la recherche d'un emploi** (ex : "je cherche un CDI", "je recherche une alternance").
* Concerne uniquement des **stages, alternances, techniciens, assistants**.
* Mentionne **plus de 3 postes** (même s'ils sont clairs et précis).
* Est **vague, non ciblé ou purement théorique**.
* **Ne mentionne aucun poste clair**.

Soyez TRÈS attentif aux nuances et analysez bien si c'est l'entreprise de l'auteur qui recrute directement.`;

  const userPrompt = `Analysez ce post LinkedIn :

Titre : ${post.title || 'Aucun titre'}

Contenu : ${post.text}

Auteur : ${post.author_name}`;

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

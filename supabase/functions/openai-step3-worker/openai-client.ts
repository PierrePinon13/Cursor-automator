
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

export async function callOpenAIStep3(post: any) {
  const systemPrompt = `## 📂 Catégories d'offres & Exemples de Postes

### 1. **Tech**
Métiers liés au développement, à l'ingénierie, aux systèmes, à l'infrastructure et à la cybersécurité.

**Exemples de postes :**
- Développeur (Backend / Frontend / Fullstack / Mobile)
- Software Engineer / Ingénieur Logiciel / Embarqué
- Architecte (Logiciel / Technique / Cloud)
- QA Engineer / Testeur Logiciel
- DevOps / Site Reliability Engineer / Cloud Engineer
- Ingénieur Système / Réseau / Infrastructure
- Ingénieur Cybersécurité / Pentester
- Tech Lead / Lead Developer / Engineering Manager
- Consultant Technique / Intégrateur

---

### 2. **Business**
Métiers du marketing, des ventes, de la croissance et de la gestion de projets.

**Exemples de postes :**

🔹 *Projet & Gestion d'activité* :
- Chef de projet (MOE / MOA / IT / Digital)
- IT Project Manager / Delivery Manager / PMO

🔹 *Marketing & Growth* :
- Responsable Marketing / Growth Hacker
- SEO / SEA / SEM Specialist
- Content Marketer / Brand Content Manager
- Social Media Manager
- Responsable CRM / Paid Media / Acquisition
- Marketing Ops / Head of Growth
- Digital Strategist

🔹 *Sales & Ops* :
- Business Developer / Sales Executive / Account Manager
- Customer Success Manager / Responsable Relation Client
- Sales Ops / Revenue Ops
- Avant-Vente / Consultant Présales / Solution Engineer
- Inside Sales / Key Account Manager / Account Executive
- Sales Manager / Regional Sales Manager / Area Sales Manager

---

### 3. **Product**
Métiers liés à la gestion produit et à l'expérience utilisateur.

**Exemples de postes :**
- Product Owner / Product Manager
- Head of Product / Lead Product Manager
- UX Designer / UI Designer / Product Designer
- UX Researcher / User Researcher
- Product Marketing Manager / Product Strategist

---

### 4. **Executive Search**
Postes de direction et de niveau C-Level.

**Exemples de postes :**
- CEO / COO / CFO / CTO / CMO / CHRO / CPO
- Vice-Président / VP
- Directeur Général / Directeur d'entité
- Head of *** / Managing Director
- Membre du Codir / Directeur Stratégie / Transformation

---

### 5. **Comptelio**
Métiers de la comptabilité, finance et administration.

**Exemples de postes :**
- Responsable Comptable
- Contrôleur de Gestion / Financier
- Analyste Financier / Trésorier
- Gestionnaire de Paie / Responsable Paie
- RAF / DAF
- Fiscaliste / Responsable Fiscalité

---

### 6. **RH**
Métiers des Ressources Humaines, du recrutement.

**Exemples de postes :**
- Talent Acquisition / Recruteur IT
- Chargé(e) RH / Chargé(e) de Recrutement
- HRBP
- Responsable RH / Responsable Paie 
- DRH / Head of People 
- Responsable Formation 
- Expert QVT / Diversité & Inclusion

Attention, nous ne sommes intéressés que par les postes purement RH listés ci-dessus. Pas les postes avec une composante RH, type : enseignant, formateur, animateur etc. Les postes à dominante Sales ne doivent pas être confondus avec ces postes RH.

---

### 7. **Freelance**
Postes en mission, freelance, ou temps partagé. Nous ne sommes intéressés que par les postes tech (développeurs, devops, data etc) ou dans le digital.

**Exemples de postes :**
- Développeur / Tech Lead freelance
- DevOps / QA / Data en mission
- CTO de transition / Directeur Technique externalisé
- Expert Sécurité en temps partiel
- Growth Manager freelance
- Product Designer Freelance

---

### 8. **Data**
Métiers liés à la donnée et à l'IA.

**Exemples de postes :**
- Data Scientist / Analyst / Engineer
- BI Analyst / BI Developer
- Machine Learning Engineer / AI Specialist
- Data Architect / Big Data Engineer
- MLOps / DataOps / Data Quality Analyst
- Prompt Engineer / LLM Engineer
- Data Product Manager / Data Strategist

---

### 9. **Autre**
Pour les postes ne rentrant dans aucune des catégories précédentes.`;

  const userPrompt = `# CONTEXT

Vous êtes un assistant spécialisé dans l'analyse des publications LinkedIn pour l'équipe commerciale d'un cabinet de recrutement. Votre mission est d'examiner une publication LinkedIn, en vous concentrant principalement sur les **postes mentionnés par l'utilisateur**, afin de classer ces postes dans **une seule catégorie d'offre** et de normaliser les titres associés.

# OBJECTIVE

Analyser la publication LinkedIn et les postes fournis par l'utilisateur pour :

1. Sélectionner **une seule** catégorie parmi les 9 proposées.
2. Identifier les postes fournis qui relèvent de cette catégorie.
3. Les normaliser selon les règles fournies.

# INSTRUCTIONS

1. Analysez les postes indiqués par l'utilisateur : ${post.openai_step1_postes || 'Non spécifiés'}

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
${post.title || 'Aucun titre'}
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
\`\`\``;

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

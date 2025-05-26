
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postId } = await req.json();
    
    if (!postId) {
      return new Response('Post ID is required', { status: 400, headers: corsHeaders });
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response('OpenAI API key not configured', { status: 500, headers: corsHeaders });
    }

    // Fetch the post data
    const { data: post, error: fetchError } = await supabaseClient
      .from('linkedin_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (fetchError || !post) {
      console.error('Error fetching post:', fetchError);
      return new Response('Post not found', { status: 404, headers: corsHeaders });
    }

    console.log('Processing post:', post.id);

    // Update status to processing
    await supabaseClient
      .from('linkedin_posts')
      .update({ processing_status: 'processing' })
      .eq('id', postId);

    // Step 1: Check if post shows recruitment need
    console.log('Starting OpenAI Step 1: Recruitment detection');
    
    const step1Response = await fetch('https://api.openai.com/v1/chat/completions', {
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
* **Ne mentionne aucun poste clair**.`
          },
          {
            role: 'user',
            content: `Titre : ${post.title || ''}\nPost : ${post.text}`
          }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    const step1Data = await step1Response.json();
    const step1Result = JSON.parse(step1Data.choices[0].message.content);
    
    console.log('Step 1 result:', step1Result);

    // Update post with step 1 results
    await supabaseClient
      .from('linkedin_posts')
      .update({
        openai_step1_recrute_poste: step1Result.recrute_poste,
        openai_step1_postes: step1Result.postes,
        openai_step1_response: step1Data
      })
      .eq('id', postId);

    // If step 1 says "Non", filter out and stop processing
    if (step1Result.recrute_poste !== 'Oui') {
      console.log('Post filtered out at step 1 - no recruitment detected');
      await supabaseClient
        .from('linkedin_posts')
        .update({ processing_status: 'filtered_out' })
        .eq('id', postId);
      
      return new Response(JSON.stringify({ success: true, filtered_at: 'step1' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Step 2: Check if recruitment is probably in France
    console.log('Starting OpenAI Step 2: France location check');
    
    const step2Response = await fetch('https://api.openai.com/v1/chat/completions', {
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

    const step2Data = await step2Response.json();
    const step2Result = JSON.parse(step2Data.choices[0].message.content);
    
    console.log('Step 2 result:', step2Result);

    // Update post with step 2 results
    await supabaseClient
      .from('linkedin_posts')
      .update({
        openai_step2_reponse: step2Result.reponse,
        openai_step2_langue: step2Result.langue,
        openai_step2_localisation: step2Result.localisation_detectee,
        openai_step2_raison: step2Result.raison,
        openai_step2_response: step2Data
      })
      .eq('id', postId);

    // If step 2 says "Non", filter out and stop processing
    if (step2Result.reponse !== 'Oui') {
      console.log('Post filtered out at step 2 - not in France/target zone');
      await supabaseClient
        .from('linkedin_posts')
        .update({ processing_status: 'filtered_out' })
        .eq('id', postId);
      
      return new Response(JSON.stringify({ success: true, filtered_at: 'step2' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Step 3: Categorize the selected positions
    console.log('Starting OpenAI Step 3: Position categorization');
    
    const step3Response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `## 📂 Catégories d'offres & Exemples de Postes

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
Pour les postes ne rentrant dans aucune des catégories précédentes.`
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

    const step3Data = await step3Response.json();
    const step3Result = JSON.parse(step3Data.choices[0].message.content);
    
    console.log('Step 3 result:', step3Result);

    // Update post with step 3 results and mark as completed
    await supabaseClient
      .from('linkedin_posts')
      .update({
        openai_step3_categorie: step3Result.categorie,
        openai_step3_postes_selectionnes: step3Result.postes_selectionnes,
        openai_step3_justification: step3Result.justification,
        openai_step3_response: step3Data,
        processing_status: 'completed'
      })
      .eq('id', postId);

    console.log('Post processing completed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      postId,
      step1: step1Result,
      step2: step2Result,
      step3: step3Result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in process-linkedin-post function:', error);
    
    // Update status to error if we have a postId
    if (req.body?.postId) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        await supabaseClient
          .from('linkedin_posts')
          .update({ processing_status: 'error' })
          .eq('id', req.body.postId);
      } catch (updateError) {
        console.error('Failed to update error status:', updateError);
      }
    }
    
    return new Response('Internal server error', { 
      status: 500,
      headers: corsHeaders
    });
  }
});

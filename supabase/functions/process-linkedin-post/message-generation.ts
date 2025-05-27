
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface MessageGenerationResult {
  success: boolean;
  message?: string;
  error?: string;
}

export async function generateApproachMessage(
  openAIApiKey: string,
  post: any,
  authorName: string,
  selectedPositions: string[]
): Promise<MessageGenerationResult> {
  console.log('Starting approach message generation for:', authorName);
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: `## 🎯 Objectif

Générer un message court, professionnel et personnalisé (max. 300 caractères) à envoyer sur LinkedIn pour initier un échange suite à une publication mentionnant un besoin de recrutement.

## 🏢 Contexte

Tu es recruteur chez **Getpro**, un cabinet spécialisé dans la **chasse par approche directe** de profils complexes, notamment sur les domaines :

* Sales
* Marketing
* Tech
* Product
* Data

## 📝 Données en entrée

Tu recevras :

* Le **prénom** de la personne ciblée
* Le **contenu de la publication LinkedIn** (copié tel quel)
* Le ou les **postes recherchés** mentionnés dans la publication

## ✍️ Structure du message généré

1. **Salutation personnalisée**

   * Forme : \`Bonjour [Prénom],\`
   * (Ajouter un saut de ligne)

2. **Phrase d'accroche**

   * Forme : "J'ai vu que vous recherchiez un [nom du poste]"
   * Utiliser directement le **nom du poste** sans ajouter le mot "profil" devant
   * Exemples : "un Content Manager", "un Développeur Frontend", "un Data Scientist"
   * Simplifier seulement si nécessaire mais éviter la sur-simplification
   * Si plusieurs postes : utiliser le premier ou les grouper intelligemment

3. **Positionnement sobre**

   * "Je connais bien ces recherches"

4. **Proposition de valeur concrète**

   * "Je peux vous présenter des candidats si cela peut vous faire gagner du temps."

5. **Clôture polie**

   * "Bonne journée"

## 🧱 Contraintes

* Ton **professionnel, direct et humain**
* Pas de tutoiement
* Pas de formalisme excessif
* Pas de jargon RH
* **300 caractères maximum** (espaces et sauts de ligne inclus)
* Sortie au format JSON :

\`\`\`json
{
  "message_approche": "Bonjour Julie,\\n\\nJ'ai vu que vous recherchiez un Content Manager. Je connais bien ces recherches, je peux vous présenter des candidats si cela peut vous faire gagner du temps. Bonne journée"
}
\`\`\``
          },
          {
            role: 'user',
            content: `Prénom : ${authorName}
Publication LinkedIn : ${post.title || ''} ${post.text}
Postes recherchés : ${selectedPositions.join(', ')}`
          }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid OpenAI response structure:', data);
      return { success: false, error: 'Invalid OpenAI response structure' };
    }

    const result = JSON.parse(data.choices[0].message.content);
    
    console.log('Generated approach message:', result.message_approche);
    return { 
      success: true, 
      message: result.message_approche 
    };

  } catch (error) {
    console.error('Error generating approach message:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}


import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface MessageGenerationResult {
  success: boolean;
  message?: string;
  error?: string;
  attempts?: number;
  usedDefaultTemplate?: boolean;
}

export async function generateApproachMessageWithRetry(
  openAIApiKey: string,
  post: any,
  authorName: string,
  selectedPositions: string[] | string
): Promise<MessageGenerationResult> {
  const maxRetries = 3;
  let lastError = '';
  
  // Normaliser selectedPositions en array
  let positionsArray: string[] = [];
  try {
    if (typeof selectedPositions === 'string') {
      positionsArray = [selectedPositions];
      console.log('selectedPositions was a string, converted to array:', positionsArray);
    } else if (Array.isArray(selectedPositions)) {
      positionsArray = selectedPositions;
    } else {
      console.error('selectedPositions is neither string nor array:', typeof selectedPositions, selectedPositions);
      positionsArray = ['profil'];
    }
  } catch (error) {
    console.error('Error normalizing selectedPositions:', error);
    positionsArray = ['profil'];
  }

  console.log(`Starting approach message generation with retry for: ${authorName}, positions: ${positionsArray.join(', ')}`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Attempt ${attempt}/${maxRetries} for generating approach message`);
    
    try {
      const result = await generateApproachMessage(openAIApiKey, post, authorName, positionsArray);
      
      if (result.success && result.message) {
        console.log(`✅ Message generated successfully on attempt ${attempt}`);
        return {
          ...result,
          attempts: attempt,
          usedDefaultTemplate: false
        };
      } else {
        lastError = result.error || 'Unknown error from OpenAI';
        console.log(`❌ Attempt ${attempt} failed: ${lastError}`);
      }
    } catch (error) {
      lastError = error.message || 'Unexpected error during generation';
      console.error(`❌ Attempt ${attempt} threw exception:`, error);
    }

    // Attendre avant la prochaine tentative (délai progressif)
    if (attempt < maxRetries) {
      const delay = attempt * 2000; // 2s, 4s, 6s
      console.log(`⏳ Waiting ${delay}ms before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Toutes les tentatives ont échoué, utiliser le template par défaut
  console.log(`🔄 All ${maxRetries} attempts failed, falling back to default template`);
  const defaultMessage = generateDefaultTemplate(authorName, positionsArray);
  
  return {
    success: true,
    message: defaultMessage,
    error: `OpenAI generation failed after ${maxRetries} attempts. Last error: ${lastError}`,
    attempts: maxRetries,
    usedDefaultTemplate: true
  };
}

export async function generateApproachMessage(
  openAIApiKey: string,
  post: any,
  authorName: string,
  selectedPositions: string[]
): Promise<MessageGenerationResult> {
  console.log('Starting approach message generation for:', authorName);
  console.log('Selected positions:', selectedPositions);
  console.log('Post content preview:', post.text?.substring(0, 200));
  
  try {
    // Validation des paramètres d'entrée
    if (!selectedPositions || selectedPositions.length === 0) {
      console.error('selectedPositions is empty or undefined');
      selectedPositions = ['profil'];
    }

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
   * (Ajouter un saut de ligne après cette phrase)

3. **Positionnement sobre**

   * "Je connais bien ces recherches"

4. **Proposition de valeur concrète**

   * "Je peux vous présenter des candidats si cela peut vous faire gagner du temps."
   * (Ajouter un saut de ligne après cette phrase)

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
  "message_approche": "Bonjour Julie,\\n\\nJ'ai vu que vous recherchiez un Content Manager.\\n\\nJe connais bien ces recherches, je peux vous présenter des candidats si cela peut vous faire gagner du temps.\\n\\nBonne journée"
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, response.statusText, errorText);
      return { 
        success: false, 
        error: `OpenAI API error: ${response.status} ${response.statusText} - ${errorText}` 
      };
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid OpenAI response structure:', data);
      return { success: false, error: 'Invalid OpenAI response structure' };
    }

    let result;
    try {
      result = JSON.parse(data.choices[0].message.content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI JSON response:', data.choices[0].message.content);
      return { success: false, error: 'Failed to parse OpenAI JSON response' };
    }
    
    if (!result.message_approche) {
      console.error('No message_approche in OpenAI response:', result);
      return { success: false, error: 'No message_approche in OpenAI response' };
    }

    console.log('✅ Generated approach message:', result.message_approche);
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

function generateDefaultTemplate(authorName: string, selectedPositions: string[]): string {
  const firstName = authorName?.split(' ')[0] || 'Cher(e) professionnel(le)';
  const position = selectedPositions?.[0] || 'profils qualifiés';
  
  return `Bonjour ${firstName},

J'ai vu que vous recherchiez un ${position}.

Je connais bien ces recherches, je peux vous présenter des candidats si cela peut vous faire gagner du temps.

Bonne journée`;
}

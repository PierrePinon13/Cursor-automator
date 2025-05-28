
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { diagnosticsData } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY non configurée');
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
            content: `Tu es un expert en analyse de données de pipeline LinkedIn. 
            Analyse les données de diagnostic fournies et identifie :
            1. Les problèmes principaux dans le pipeline
            2. Les causes probables des leads manqués
            3. Des recommandations concrètes pour améliorer le taux de conversion
            4. Les étapes où il y a le plus de pertes
            
            Réponds en français de manière claire et structurée avec des bullet points.
            Sois précis et actionnable dans tes recommandations.`
          },
          {
            role: 'user',
            content: `Voici les données de diagnostic du pipeline LinkedIn :\n\n${diagnosticsData}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Erreur OpenAI: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erreur dans analyze-diagnostics:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      analysis: 'Erreur lors de l\'analyse automatique des données de diagnostic.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

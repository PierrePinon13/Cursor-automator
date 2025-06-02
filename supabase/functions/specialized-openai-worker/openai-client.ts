
export async function callOpenAI(prompt: string, systemMessage: string, temperature = 0.1, maxTokens = 500) {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
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
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt }
      ],
      temperature,
      max_tokens: maxTokens
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

export function parseOpenAIResponse(data: any, fallbackParser?: (content: string) => any) {
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch (parseError) {
    if (fallbackParser) {
      return fallbackParser(data.choices[0].message.content);
    }
    throw new Error('Failed to parse OpenAI response');
  }
}

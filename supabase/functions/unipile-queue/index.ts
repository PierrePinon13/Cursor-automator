
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple timestamp tracking per account_id
const lastCallTime = new Map<string, number>();

// Random delay between 2-8 seconds
function getRandomDelay(): number {
  return Math.floor(Math.random() * (8000 - 2000 + 1)) + 2000;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Exponential backoff for retries
function getRetryDelay(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds
}

async function executeWithRateLimit(accountId: string, operation: string, unipileApiKey: string, payload: any, isPriority: boolean = false) {
  console.log(`🚀 Executing ${operation} for account ${accountId} (priority: ${isPriority})`);
  console.log(`📄 Payload details:`, JSON.stringify(payload, null, 2));

  // Check if we need to wait before making the call
  const lastCall = lastCallTime.get(accountId) || 0;
  const now = Date.now();
  const timeSinceLastCall = now - lastCall;
  const minDelay = getRandomDelay();

  if (timeSinceLastCall < minDelay) {
    const waitTime = minDelay - timeSinceLastCall;
    console.log(`⏳ Rate limiting: waiting ${waitTime}ms before Unipile call for account ${accountId}`);
    await sleep(waitTime);
  }

  // Retry logic with exponential backoff
  let lastError: Error | null = null;
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt + 1}/${maxRetries} for ${operation}`);
      
      // Execute the API call based on operation type
      let result;
      
      switch (operation) {
        case 'scrape_profile':
          result = await scrapeProfile(unipileApiKey, accountId, payload);
          break;
        case 'send_message':
          result = await sendMessage(unipileApiKey, accountId, payload);
          break;
        case 'send_invitation':
          result = await sendInvitation(unipileApiKey, accountId, payload);
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      // Update last call time on success
      lastCallTime.set(accountId, Date.now());

      console.log(`✅ Successfully executed ${operation} for account ${accountId} on attempt ${attempt + 1}`);
      console.log(`📋 Operation result:`, JSON.stringify(result, null, 2));
      return result;

    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Attempt ${attempt + 1} failed for ${operation}:`, error);

      // Check if it's a provider error (Unipile API issues)
      const isProviderError = error.message.includes('provider_error') || 
                             error.message.includes('operational problems') ||
                             error.message.includes('500');

      // Don't retry on authentication or validation errors (4xx except 429)
      const isClientError = error.message.includes('401') || 
                            error.message.includes('403') || 
                            error.message.includes('404') ||
                            error.message.includes('400');

      if (isClientError && !error.message.includes('429')) {
        console.log(`🚫 Client error detected, not retrying: ${error.message}`);
        break;
      }

      // If it's the last attempt, don't wait
      if (attempt === maxRetries - 1) {
        break;
      }

      // Wait before retry with exponential backoff
      const retryDelay = getRetryDelay(attempt);
      console.log(`⏳ Waiting ${retryDelay}ms before retry ${attempt + 2}`);
      await sleep(retryDelay);
    }
  }

  // All retries failed
  console.error(`💥 All ${maxRetries} attempts failed for ${operation}:`, lastError);
  throw lastError;
}

async function scrapeProfile(unipileApiKey: string, accountId: string, payload: any) {
  const { authorProfileId } = payload;
  
  if (!authorProfileId) {
    throw new Error('Missing authorProfileId in payload');
  }
  
  console.log(`🔍 Scraping profile ${authorProfileId} for account ${accountId}`);
  
  const response = await fetch(
    `https://api9.unipile.com:13946/api/v1/users/${authorProfileId}?account_id=${accountId}&linkedin_sections=experience`,
    {
      method: 'GET',
      headers: {
        'X-API-KEY': unipileApiKey,
        'accept': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Scrape profile failed: ${response.status} - ${errorText}`);
    throw new Error(`Scrape profile failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('✅ Profile scraping result:', { 
    provider_id: result.provider_id, 
    network_distance: result.network_distance,
    headline: result.headline,
    company: result.company?.name 
  });

  return result;
}

async function sendMessage(unipileApiKey: string, accountId: string, payload: any) {
  const { providerId, message } = payload;

  if (!providerId || !message) {
    throw new Error('Missing providerId or message in payload');
  }

  console.log(`💬 Sending message to ${providerId} on account ${accountId}`);
  console.log(`📝 Message content: "${message}"`);

  const response = await fetch(`https://api9.unipile.com:13946/api/v1/chats`, {
    method: 'POST',
    headers: {
      'X-API-KEY': unipileApiKey,
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      account_id: accountId,
      attendees_ids: providerId,
      text: message
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Send message failed: ${response.status} - ${errorText}`);
    throw new Error(`Send message failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log(`✅ Message sent successfully:`, result);
  return result;
}

async function sendInvitation(unipileApiKey: string, accountId: string, payload: any) {
  const { providerId, message } = payload;

  if (!providerId || !message) {
    throw new Error('Missing providerId or message in payload');
  }

  console.log(`🤝 Sending invitation to ${providerId} on account ${accountId}`);
  console.log(`📝 Invitation message content: "${message}"`);
  console.log(`📊 Message length: ${message.length} characters`);

  // Structure corrigée selon l'API Unipile officielle
  const requestBody = {
    provider_id: providerId,
    account_id: accountId,
    message: message  // Utilisation du champ 'message' au lieu de 'text'
  };

  console.log(`📤 Request body being sent to Unipile:`, JSON.stringify(requestBody, null, 2));

  const response = await fetch(`https://api9.unipile.com:13946/api/v1/users/invite`, {
    method: 'POST',
    headers: {
      'X-API-KEY': unipileApiKey,
      'Accept': 'application/json',
      'Content-Type': 'application/json',  // Changé de 'application/x-www-form-urlencoded' à 'application/json'
    },
    body: JSON.stringify(requestBody),  // Envoi en JSON au lieu de URLSearchParams
  });

  console.log(`📡 Unipile response status: ${response.status}`);
  console.log(`📡 Unipile response headers:`, Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Send invitation failed: ${response.status} - ${errorText}`);
    console.error(`❌ Failed request details:`, {
      url: 'https://api9.unipile.com:13946/api/v1/users/invite',
      method: 'POST',
      body: JSON.stringify(requestBody, null, 2),
      status: response.status,
      error: errorText
    });
    throw new Error(`Send invitation failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log(`✅ Invitation sent successfully to ${providerId}`);
  console.log(`📋 Full Unipile response:`, JSON.stringify(result, null, 2));
  
  // Log specific fields that indicate success
  if (result.id) {
    console.log(`🎯 Invitation ID from Unipile: ${result.id}`);
  }
  if (result.status) {
    console.log(`📌 Invitation status from Unipile: ${result.status}`);
  }
  
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const requestBody = await req.json()
    const { action, account_id, operation, payload, priority = false } = requestBody

    console.log('🔧 Unipile queue request:', { action, account_id, operation, priority })
    console.log('📥 Full request body:', JSON.stringify(requestBody, null, 2))

    if (!account_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Account ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!operation) {
      return new Response(
        JSON.stringify({ success: false, error: 'Operation is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const unipileApiKey = Deno.env.get('UNIPILE_API_KEY')
    if (!unipileApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unipile API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (action === 'execute') {
      // Execute with rate limiting and retry logic
      const result = await executeWithRateLimit(account_id, operation, unipileApiKey, payload, priority);
      
      console.log(`🎉 Final result for ${operation}:`, JSON.stringify(result, null, 2));
      
      return new Response(
        JSON.stringify({ success: true, result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )

  } catch (error) {
    console.error('💥 Error in unipile-queue function:', error)
    console.error('🔍 Error stack trace:', error.stack)
    
    // Classify error types for better user messaging
    let errorType = 'unknown';
    let userMessage = 'Une erreur inattendue s\'est produite.';
    
    if (error.message.includes('provider_error') || error.message.includes('operational problems')) {
      errorType = 'provider_unavailable';
      userMessage = 'LinkedIn est temporairement indisponible. Veuillez réessayer dans quelques minutes.';
    } else if (error.message.includes('401') || error.message.includes('403')) {
      errorType = 'authentication';
      userMessage = 'Erreur d\'authentification avec LinkedIn. Veuillez reconnecter votre compte.';
    } else if (error.message.includes('429')) {
      errorType = 'rate_limit';
      userMessage = 'Trop de demandes. Veuillez patienter avant de réessayer.';
    } else if (error.message.includes('404')) {
      errorType = 'not_found';
      userMessage = 'Profil LinkedIn non trouvé ou inaccessible.';
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        error_type: errorType,
        user_message: userMessage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

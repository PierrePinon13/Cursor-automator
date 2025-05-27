
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple timestamp tracking per account_id
const lastCallTime = new Map<string, number>(); // account_id -> timestamp

// Random delay between 2-8 seconds
function getRandomDelay(): number {
  return Math.floor(Math.random() * (8000 - 2000 + 1)) + 2000;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeWithRateLimit(accountId: string, operation: string, unipileApiKey: string, payload: any, isPriority: boolean = false) {
  console.log(`Executing ${operation} for account ${accountId} (priority: ${isPriority})`);

  // Check if we need to wait before making the call
  const lastCall = lastCallTime.get(accountId) || 0;
  const now = Date.now();
  const timeSinceLastCall = now - lastCall;
  const minDelay = getRandomDelay();

  if (timeSinceLastCall < minDelay) {
    const waitTime = minDelay - timeSinceLastCall;
    console.log(`Rate limiting: waiting ${waitTime}ms before Unipile call for account ${accountId}`);
    await sleep(waitTime);
  }

  try {
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

    // Update last call time
    lastCallTime.set(accountId, Date.now());

    console.log(`Successfully executed ${operation} for account ${accountId}`);
    return result;

  } catch (error) {
    console.error(`Error executing ${operation}:`, error);
    throw error;
  }
}

async function scrapeProfile(unipileApiKey: string, accountId: string, payload: any) {
  const { authorProfileId } = payload;
  
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
    console.error(`Scrape profile failed: ${response.status} - ${errorText}`);
    throw new Error(`Scrape profile failed: ${response.status}`);
  }

  return await response.json();
}

async function sendMessage(unipileApiKey: string, accountId: string, payload: any) {
  const { providerId, message } = payload;

  console.log(`Sending message to ${providerId} on account ${accountId}`);

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
    console.error(`Send message failed: ${response.status} - ${errorText}`);
    throw new Error(`Send message failed: ${response.status}`);
  }

  return await response.json();
}

async function sendInvitation(unipileApiKey: string, accountId: string, payload: any) {
  const { providerId, message } = payload;

  console.log(`Sending invitation to ${providerId} on account ${accountId}`);
  console.log(`Invitation message: ${message}`);

  const formData = new URLSearchParams({
    account_id: accountId,
    provider: 'LINKEDIN',
    provider_id: providerId,
    text: message
  });

  console.log(`Form data being sent:`, formData.toString());

  const response = await fetch(`https://api9.unipile.com:13946/api/v1/users/invite`, {
    method: 'POST',
    headers: {
      'X-API-KEY': unipileApiKey,
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Send invitation failed: ${response.status} - ${errorText}`);
    console.error(`Response body: ${errorText}`);
    throw new Error(`Send invitation failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log(`Invitation sent successfully:`, result);
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { action, account_id, operation, payload, priority = false } = await req.json()

    const unipileApiKey = Deno.env.get('UNIPILE_API_KEY')
    if (!unipileApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unipile API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (action === 'execute') {
      // Execute with rate limiting (priority=true for LinkedIn messages)
      const result = await executeWithRateLimit(account_id, operation, unipileApiKey, payload, priority);
      
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
    console.error('Error in unipile-queue function:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})


import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QueueItem {
  id: string;
  account_id: string;
  priority: number; // 1 = highest (LinkedIn messages), 2 = medium, 3 = lowest
  operation: string;
  payload: any;
  created_at: number;
  retry_count: number;
}

// In-memory queue (could be moved to Redis for production)
const queue = new Map<string, QueueItem[]>(); // account_id -> queue items
const lastCallTime = new Map<string, number>(); // account_id -> timestamp

// Random delay between 2-8 seconds
function getRandomDelay(): number {
  return Math.floor(Math.random() * (8000 - 2000 + 1)) + 2000;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processQueue(accountId: string, unipileApiKey: string) {
  const accountQueue = queue.get(accountId) || [];
  if (accountQueue.length === 0) return;

  // Sort by priority (1 = highest priority)
  accountQueue.sort((a, b) => a.priority - b.priority);

  const item = accountQueue.shift();
  if (!item) return;

  // Update queue
  queue.set(accountId, accountQueue);

  console.log(`Processing queue item: ${item.operation} for account ${accountId}`);

  // Check if we need to wait before making the call
  const lastCall = lastCallTime.get(accountId) || 0;
  const now = Date.now();
  const timeSinceLastCall = now - lastCall;
  const minDelay = getRandomDelay();

  if (timeSinceLastCall < minDelay) {
    const waitTime = minDelay - timeSinceLastCall;
    console.log(`Waiting ${waitTime}ms before next Unipile call for account ${accountId}`);
    await sleep(waitTime);
  }

  try {
    // Execute the API call based on operation type
    let result;
    
    switch (item.operation) {
      case 'scrape_profile':
        result = await scrapeProfile(unipileApiKey, accountId, item.payload);
        break;
      case 'send_message':
        result = await sendMessage(unipileApiKey, accountId, item.payload);
        break;
      case 'send_invitation':
        result = await sendInvitation(unipileApiKey, accountId, item.payload);
        break;
      default:
        throw new Error(`Unknown operation: ${item.operation}`);
    }

    // Update last call time
    lastCallTime.set(accountId, Date.now());

    console.log(`Successfully processed ${item.operation} for account ${accountId}`);
    return result;

  } catch (error) {
    console.error(`Error processing ${item.operation}:`, error);
    
    // Retry logic
    if (item.retry_count < 3) {
      item.retry_count++;
      item.created_at = Date.now() + (item.retry_count * 5000); // Exponential backoff
      accountQueue.unshift(item); // Add back to front of queue
      queue.set(accountId, accountQueue);
      console.log(`Retrying ${item.operation} (attempt ${item.retry_count})`);
    }
    
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
    throw new Error(`Scrape profile failed: ${response.status}`);
  }

  return await response.json();
}

async function sendMessage(unipileApiKey: string, accountId: string, payload: any) {
  const { providerId, message } = payload;

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
    throw new Error(`Send message failed: ${response.status}`);
  }

  return await response.json();
}

async function sendInvitation(unipileApiKey: string, accountId: string, payload: any) {
  const { providerId, message } = payload;

  const response = await fetch(`https://api9.unipile.com:13946/api/v1/users/invite`, {
    method: 'POST',
    headers: {
      'X-API-KEY': unipileApiKey,
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      account_id: accountId,
      provider: 'LINKEDIN',
      provider_id: providerId,
      text: message
    }),
  });

  if (!response.ok) {
    throw new Error(`Send invitation failed: ${response.status}`);
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { action, account_id, priority = 3, operation, payload } = await req.json()

    const unipileApiKey = Deno.env.get('UNIPILE_API_KEY')
    if (!unipileApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unipile API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (action === 'add_to_queue') {
      // Add item to queue
      const queueItem: QueueItem = {
        id: crypto.randomUUID(),
        account_id,
        priority,
        operation,
        payload,
        created_at: Date.now(),
        retry_count: 0
      };

      const accountQueue = queue.get(account_id) || [];
      accountQueue.push(queueItem);
      queue.set(account_id, accountQueue);

      console.log(`Added ${operation} to queue for account ${account_id} with priority ${priority}`);

      return new Response(
        JSON.stringify({ success: true, queue_id: queueItem.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'process_queue') {
      // Process the queue for this account
      const result = await processQueue(account_id, unipileApiKey);
      
      return new Response(
        JSON.stringify({ success: true, result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'execute_now') {
      // Execute immediately with delay check (for high priority items)
      const lastCall = lastCallTime.get(account_id) || 0;
      const now = Date.now();
      const timeSinceLastCall = now - lastCall;
      const minDelay = getRandomDelay();

      if (timeSinceLastCall < minDelay) {
        const waitTime = minDelay - timeSinceLastCall;
        console.log(`Waiting ${waitTime}ms before immediate Unipile call for account ${account_id}`);
        await sleep(waitTime);
      }

      let result;
      switch (operation) {
        case 'scrape_profile':
          result = await scrapeProfile(unipileApiKey, account_id, payload);
          break;
        case 'send_message':
          result = await sendMessage(unipileApiKey, account_id, payload);
          break;
        case 'send_invitation':
          result = await sendInvitation(unipileApiKey, account_id, payload);
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      lastCallTime.set(account_id, Date.now());

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


import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Apify webhook received')
    
    // Parse the incoming webhook data
    const webhookData = await req.json()
    console.log('Apify webhook data:', JSON.stringify(webhookData, null, 2))

    // Extract the dataset ID from the webhook data
    const datasetId = webhookData.datasetId || webhookData.dataset_id || webhookData.id
    
    if (!datasetId) {
      console.error('No dataset ID found in webhook data')
      return new Response('Missing dataset ID', { 
        status: 400,
        headers: corsHeaders 
      })
    }

    console.log('Dataset ID found:', datasetId)

    // Get the Apify API key from environment
    const apifyApiKey = Deno.env.get('APIFY_API_KEY')
    if (!apifyApiKey) {
      console.error('Apify API key not configured')
      return new Response('Apify API key not configured', { 
        status: 500,
        headers: corsHeaders 
      })
    }

    // Fetch the dataset items from Apify
    console.log('Fetching dataset items from Apify...')
    const apifyResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&format=json`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apifyApiKey}`,
        'Accept': 'application/json',
      },
    })

    if (!apifyResponse.ok) {
      const errorText = await apifyResponse.text()
      console.error('Apify API error:', apifyResponse.status, errorText)
      return new Response(`Apify API error: ${apifyResponse.status}`, { 
        status: 500,
        headers: corsHeaders 
      })
    }

    const datasetItems = await apifyResponse.json()
    console.log('Dataset items retrieved:', datasetItems.length, 'items')
    console.log('Sample data:', JSON.stringify(datasetItems.slice(0, 2), null, 2))

    // TODO: Process the dataset items here
    // You can add logic to store the data in your database or process it as needed

    return new Response('OK', { 
      status: 200,
      headers: corsHeaders
    })

  } catch (error) {
    console.error('Error in apify-webhook function:', error)
    return new Response('Internal server error', { 
      status: 500,
      headers: corsHeaders
    })
  }
})

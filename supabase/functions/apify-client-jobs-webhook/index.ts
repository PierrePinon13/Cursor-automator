
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log("Starting Apify Client Jobs Webhook function")

serve(async (req) => {
  // Permettre toutes les origins pour CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  // Gérer les requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }), 
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const body = await req.json()
    console.log('📦 Received webhook data:', body)

    const { datasetId } = body

    if (!datasetId) {
      return new Response(
        JSON.stringify({ error: 'datasetId is required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`✅ Successfully received dataset ID: ${datasetId}`)
    
    // Répondre avec un 200 pour confirmer la réception
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Dataset ID received successfully',
        datasetId: datasetId,
        receivedAt: new Date().toISOString()
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error processing webhook:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})


import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    console.log('🔔 Apify webhook received - processing immediately')
    
    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse the incoming webhook data
    const webhookData = await req.json()
    console.log('📨 Webhook payload:', JSON.stringify(webhookData, null, 2))

    // Extract the dataset ID from the webhook data with enhanced detection
    const datasetId = webhookData.datasetId || 
                     webhookData.dataset_id || 
                     webhookData.id ||
                     webhookData.payload?.datasetId ||
                     webhookData.eventData?.datasetId ||
                     webhookData.resource?.defaultDatasetId ||  // AJOUT: Support pour les webhooks ACTOR.RUN.SUCCEEDED
                     webhookData.resource?.datasetId
    
    if (!datasetId) {
      console.log('⚠️ No dataset ID found - responding OK for test webhook')
      console.log('📋 Available fields in webhook:', Object.keys(webhookData))
      if (webhookData.resource) {
        console.log('📋 Available fields in resource:', Object.keys(webhookData.resource))
      }
      return new Response(JSON.stringify({ status: 'received', message: 'Test webhook processed' }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ Dataset ID extracted:', datasetId)
    console.log('🔍 Dataset ID source:', 
      webhookData.datasetId ? 'webhookData.datasetId' :
      webhookData.dataset_id ? 'webhookData.dataset_id' :
      webhookData.id ? 'webhookData.id' :
      webhookData.payload?.datasetId ? 'webhookData.payload.datasetId' :
      webhookData.eventData?.datasetId ? 'webhookData.eventData.datasetId' :
      webhookData.resource?.defaultDatasetId ? 'webhookData.resource.defaultDatasetId' :
      webhookData.resource?.datasetId ? 'webhookData.resource.datasetId' : 'unknown'
    )

    // IMMEDIATE RESPONSE (< 10 seconds as required by Apify)
    // Start background processing without waiting
    console.log('🚀 Triggering background dataset processing...')
    
    supabaseClient.functions.invoke('process-dataset', {
      body: { 
        datasetId: datasetId, 
        cleanupExisting: false,
        webhook_triggered: true 
      }
    }).catch(err => {
      console.error('❌ Background processing error:', err)
    })

    // Log webhook reception for monitoring - CORRECTION: Suppression du champ webhook_payload inexistant
    try {
      const { error: logError } = await supabaseClient
        .from('apify_webhook_stats')
        .insert({
          dataset_id: datasetId,
          started_at: new Date().toISOString()
        })
      
      if (logError) {
        console.error('⚠️ Logging error:', logError)
      }
    } catch (err) {
      console.error('⚠️ Logging exception:', err)
    }

    console.log('✅ Webhook processed, background task started')

    // RESPOND IMMEDIATELY to Apify (< 10 seconds requirement)
    return new Response(JSON.stringify({ 
      status: 'received',
      message: 'Webhook processed successfully',
      dataset_id: datasetId,
      background_processing: 'started'
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Error in apify-webhook function:', error)
    
    // Still respond with 200 to prevent Apify retries for parsing errors
    return new Response(JSON.stringify({ 
      status: 'received', 
      error: 'Processing error but webhook acknowledged',
      message: error.message 
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

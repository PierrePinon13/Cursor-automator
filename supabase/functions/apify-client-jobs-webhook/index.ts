
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

console.log("🚀 Apify Client Jobs Webhook function STARTED - Version 3.0")
console.log("⏰ Function startup time:", new Date().toISOString())

// Vérification des variables d'environnement au démarrage
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'APIFY_API_KEY'];
const missingVars = requiredEnvVars.filter(varName => !Deno.env.get(varName));

if (missingVars.length > 0) {
  console.error("❌ CRITICAL: Missing environment variables:", missingVars);
} else {
  console.log("✅ All required environment variables are present");
}

serve(async (req) => {
  const startTime = Date.now()
  const requestId = crypto.randomUUID().substring(0, 8)
  
  // Log IMMÉDIAT pour s'assurer qu'on reçoit bien les requêtes
  console.log(`[${requestId}] 🔥 WEBHOOK REQUEST RECEIVED!`)
  console.log(`[${requestId}] 📥 INCOMING REQUEST:`, {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
    userAgent: req.headers.get('user-agent'),
    contentType: req.headers.get('content-type'),
    origin: req.headers.get('origin'),
    referer: req.headers.get('referer'),
    xForwardedFor: req.headers.get('x-forwarded-for'),
    xRealIp: req.headers.get('x-real-ip')
  })

  // Permettre toutes les origins pour CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  // Gérer les requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] ✅ Handling OPTIONS request`)
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Vérification immédiate de la méthode
    if (req.method !== 'POST') {
      console.log(`[${requestId}] ❌ Method ${req.method} not allowed`)
      return new Response(
        JSON.stringify({ error: 'Method not allowed', requestId, allowedMethod: 'POST' }), 
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log des headers reçus pour debugging
    console.log(`[${requestId}] 📋 Request headers:`, Object.fromEntries(req.headers.entries()))

    // Vérification des variables d'environnement en temps réel
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const apifyApiKey = Deno.env.get('APIFY_API_KEY')
    
    console.log(`[${requestId}] 🔍 Environment check:`, {
      supabaseUrl: supabaseUrl ? '✅ Present' : '❌ Missing',
      supabaseServiceKey: supabaseServiceKey ? '✅ Present' : '❌ Missing',
      apifyApiKey: apifyApiKey ? '✅ Present' : '❌ Missing'
    })
    
    if (!supabaseUrl || !supabaseServiceKey || !apifyApiKey) {
      console.error(`[${requestId}] ❌ Missing required environment variables`)
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error - missing environment variables', 
          requestId,
          missing: {
            supabaseUrl: !supabaseUrl,
            supabaseServiceKey: !supabaseServiceKey,
            apifyApiKey: !apifyApiKey
          }
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Lecture du body
    let body
    try {
      const rawBody = await req.text()
      console.log(`[${requestId}] 📄 Raw body received (${rawBody.length} chars):`, rawBody.substring(0, 1000))
      
      if (!rawBody.trim()) {
        console.log(`[${requestId}] ⚠️ Empty request body received`)
        return new Response(
          JSON.stringify({ error: 'Empty request body', requestId }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      body = JSON.parse(rawBody)
      console.log(`[${requestId}] ✅ Successfully parsed JSON body`)
      console.log(`[${requestId}] 📦 Received webhook data:`, JSON.stringify(body, null, 2))
    } catch (parseError) {
      console.error(`[${requestId}] ❌ Failed to parse request body:`, parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload', requestId, details: parseError.message }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)
    console.log(`[${requestId}] ✅ Supabase client initialized`)

    // Support pour différents formats de webhook - plus robuste
    let datasetId = null
    
    // Format 1: Direct datasetId
    if (body.datasetId) {
      datasetId = body.datasetId
      console.log(`[${requestId}] 📋 Found datasetId directly:`, datasetId)
    }
    // Format 2: Webhook Apify standard avec resource
    else if (body.resource?.defaultDatasetId) {
      datasetId = body.resource.defaultDatasetId
      console.log(`[${requestId}] 📋 Found datasetId in resource:`, datasetId)
    }
    // Format 3: eventData avec actorRunId
    else if (body.eventData?.actorRunId) {
      console.log(`[${requestId}] 🔍 Attempting to get dataset from run ID:`, body.eventData.actorRunId)
      
      try {
        const runResponse = await fetch(`https://api.apify.com/v2/actor-runs/${body.eventData.actorRunId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apifyApiKey}`,
            'Accept': 'application/json',
          },
        })

        if (runResponse.ok) {
          const runData = await runResponse.json()
          datasetId = runData.data?.defaultDatasetId
          console.log(`[${requestId}] 📋 Found dataset ID from run:`, datasetId)
        } else {
          console.error(`[${requestId}] ❌ Failed to fetch run data:`, runResponse.status)
        }
      } catch (fetchError) {
        console.error(`[${requestId}] ❌ Error fetching run data:`, fetchError)
      }
    }
    // Format 4: data.defaultDatasetId (autre format possible)
    else if (body.data?.defaultDatasetId) {
      datasetId = body.data.defaultDatasetId
      console.log(`[${requestId}] 📋 Found datasetId in data:`, datasetId)
    }

    if (!datasetId) {
      console.log(`[${requestId}] ❌ No dataset ID found in webhook data. Available keys:`, Object.keys(body))
      console.log(`[${requestId}] 📄 Full body structure:`, JSON.stringify(body, null, 2))
      return new Response(
        JSON.stringify({ 
          error: 'datasetId is required',
          requestId,
          receivedKeys: Object.keys(body),
          bodyStructure: body,
          helpMessage: 'Send datasetId directly, in resource.defaultDatasetId, eventData.actorRunId, or data.defaultDatasetId'
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`[${requestId}] 📋 Processing dataset ID: ${datasetId}`)

    // Fetch dataset items from Apify avec retry logic
    console.log(`[${requestId}] 🔄 Fetching dataset items from Apify...`)
    let apifyResponse
    let retryCount = 0
    const maxRetries = 3

    while (retryCount < maxRetries) {
      try {
        console.log(`[${requestId}] 📡 Apify API call attempt ${retryCount + 1}/${maxRetries}`)
        apifyResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&format=json`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apifyApiKey}`,
            'Accept': 'application/json',
          },
        })

        console.log(`[${requestId}] 📡 Apify API response status: ${apifyResponse.status}`)

        if (apifyResponse.ok) {
          break
        } else {
          console.log(`[${requestId}] ⚠️ Apify API attempt ${retryCount + 1} failed with status:`, apifyResponse.status)
          retryCount++
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)) // Exponential backoff
          }
        }
      } catch (fetchError) {
        console.error(`[${requestId}] ❌ Apify API attempt ${retryCount + 1} failed:`, fetchError)
        retryCount++
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
        }
      }
    }

    if (!apifyResponse || !apifyResponse.ok) {
      const errorText = apifyResponse ? await apifyResponse.text() : 'No response received'
      console.error(`[${requestId}] ❌ Apify API error after all retries:`, apifyResponse?.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: `Apify API error: ${apifyResponse?.status || 'No response'}`,
          details: errorText,
          datasetId: datasetId,
          requestId
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const datasetItems = await apifyResponse.json()
    console.log(`[${requestId}] 📊 Retrieved ${datasetItems.length} items from dataset`)

    if (!Array.isArray(datasetItems)) {
      console.error(`[${requestId}] ❌ Dataset items is not an array:`, typeof datasetItems)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid dataset format - expected array',
          received: typeof datasetItems,
          datasetId: datasetId,
          requestId
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Fetch clients for matching
    console.log(`[${requestId}] 🔍 Fetching clients...`)
    const { data: clients, error: clientsError } = await supabaseClient
      .from('clients')
      .select('id, company_name, company_linkedin_id')
      .eq('tracking_enabled', true)

    if (clientsError) {
      console.error(`[${requestId}] ❌ Error fetching clients:`, clientsError)
      return new Response(
        JSON.stringify({ error: 'Error fetching clients from database', details: clientsError.message, requestId }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`[${requestId}] 👥 Found ${clients?.length || 0} tracked clients`)

    // Process and store job offers avec meilleure gestion d'erreurs
    let processedCount = 0
    let skippedCount = 0
    let rawStoredCount = 0
    let errors = []

    for (let i = 0; i < datasetItems.length; i++) {
      const item = datasetItems[i]
      try {
        console.log(`[${requestId}] 🔄 Processing item ${i + 1}/${datasetItems.length}`)

        const companyName = item.companyName || item.company || null
        const jobUrl = item.link || item.url || null

        if (!jobUrl) {
          console.log(`[${requestId}] ⚠️ Skipping item without URL`)
          skippedCount++
          continue
        }

        // Stocker d'abord dans la table raw
        const rawJobOfferData = {
          apify_dataset_id: datasetId,
          url: jobUrl,
          title: item.title || null,
          company_name: companyName,
          location: item.location || null,
          job_type: item.employmentType || null,
          salary: item.salary || null,
          description: item.description || null,
          posted_at: item.postedAt ? new Date(item.postedAt).toISOString() : (item.publishedAt ? new Date(item.publishedAt).toISOString() : null),
          is_reposted: item.isReposted || false,
          raw_data: item
        }

        // Vérifier si cette offre brute existe déjà
        const { data: existingRawOffer, error: checkRawError } = await supabaseClient
          .from('client_job_offers_raw')
          .select('id')
          .eq('url', jobUrl)
          .single()

        if (checkRawError && checkRawError.code !== 'PGRST116') {
          console.error(`[${requestId}] ❌ Error checking existing raw offer:`, checkRawError)
          errors.push(`Check raw error for ${jobUrl}: ${checkRawError.message}`)
          skippedCount++
          continue
        }

        if (!existingRawOffer) {
          const { error: rawInsertError } = await supabaseClient
            .from('client_job_offers_raw')
            .insert(rawJobOfferData)

          if (rawInsertError) {
            console.error(`[${requestId}] ❌ Error inserting raw job offer:`, rawInsertError)
            errors.push(`Raw insert error for ${jobUrl}: ${rawInsertError.message}`)
            skippedCount++
            continue
          }

          rawStoredCount++
          console.log(`[${requestId}] ✅ Stored raw job offer:`, item.title || jobUrl)
        }

        // Filtrer les reposts - ne traiter que les offres qui ne sont PAS des reposts
        if (item.isReposted === true) {
          console.log(`[${requestId}] ⚠️ Skipping reposted job offer:`, item.title || jobUrl)
          skippedCount++
          continue
        }

        // Try to match with a client
        let matchedClient = null
        if (companyName && clients) {
          matchedClient = clients.find(client => {
            if (!client.company_name || !companyName) return false
            return client.company_name.toLowerCase().includes(companyName.toLowerCase()) ||
                   companyName.toLowerCase().includes(client.company_name.toLowerCase())
          })
        }

        // Prepare job offer data pour la table principale
        const jobOfferData = {
          apify_dataset_id: datasetId,
          title: item.title || null,
          company_name: companyName,
          url: jobUrl,
          location: item.location || null,
          job_type: item.employmentType || null,
          salary: item.salary || null,
          description: item.description || null,
          posted_at: item.postedAt ? new Date(item.postedAt).toISOString() : (item.publishedAt ? new Date(item.publishedAt).toISOString() : null),
          matched_client_id: matchedClient?.id || null,
          matched_client_name: matchedClient?.company_name || null,
          status: 'non_attribuee',
          raw_data: item
        }

        // Check if this job offer already exists in main table
        const { data: existingOffer, error: checkMainError } = await supabaseClient
          .from('client_job_offers')
          .select('id')
          .eq('url', jobUrl)
          .single()

        if (checkMainError && checkMainError.code !== 'PGRST116') {
          console.error(`[${requestId}] ❌ Error checking existing main offer:`, checkMainError)
          errors.push(`Check main error for ${jobUrl}: ${checkMainError.message}`)
          skippedCount++
          continue
        }

        if (existingOffer) {
          console.log(`[${requestId}] ⚠️ Job offer already exists in main table, skipping:`, item.title || jobUrl)
          skippedCount++
          continue
        }

        // Insert the job offer in main table
        const { error: insertError } = await supabaseClient
          .from('client_job_offers')
          .insert(jobOfferData)

        if (insertError) {
          console.error(`[${requestId}] ❌ Error inserting job offer:`, insertError)
          errors.push(`Main insert error for ${jobUrl}: ${insertError.message}`)
          skippedCount++
          continue
        }

        console.log(`[${requestId}] ✅ Inserted job offer:`, item.title || jobUrl)
        processedCount++

      } catch (error) {
        console.error(`[${requestId}] ❌ Error processing item ${i + 1}:`, error)
        errors.push(`Processing error for item ${i + 1}: ${error.message}`)
        skippedCount++
      }
    }

    const summary = `🎯 Processing complete: ${rawStoredCount} stored in raw, ${processedCount} processed, ${skippedCount} skipped`
    console.log(`[${requestId}] ${summary}`)
    
    if (errors.length > 0) {
      console.log(`[${requestId}] ⚠️ Errors encountered: ${errors.length}`)
      errors.slice(0, 5).forEach(error => console.log(`[${requestId}] - ${error}`))
    }
    
    // Répondre avec un 200 pour confirmer la réception et le traitement
    const processingTime = Date.now() - startTime
    console.log(`[${requestId}] ✅ Request completed in ${processingTime}ms`)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Dataset processed successfully',
        requestId,
        datasetId: datasetId,
        totalItems: datasetItems.length,
        rawStoredCount,
        processedCount,
        skippedCount,
        errorCount: errors.length,
        errors: errors.slice(0, 10), // Limiter les erreurs retournées
        processingTimeMs: processingTime,
        processedAt: new Date().toISOString()
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error(`[${requestId}] ❌ CRITICAL ERROR processing webhook:`, error)
    console.error(`[${requestId}] 📊 Error details:`, {
      message: error.message,
      stack: error.stack,
      processingTime
    })
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        requestId,
        message: error.message,
        stack: error.stack,
        processingTimeMs: processingTime
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

console.log("🔄 Apify Client Jobs Webhook function ready and listening...")
console.log("🌐 Function should be available at: https://csilkrfizphtbmevlkme.supabase.co/functions/v1/apify-client-jobs-webhook")

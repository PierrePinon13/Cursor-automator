
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    console.log('📦 Received webhook data:', JSON.stringify(body, null, 2))

    // Support pour différents formats de webhook
    let datasetId = null
    
    if (body.datasetId) {
      // Format direct avec datasetId
      datasetId = body.datasetId
    } else if (body.resource && body.resource.defaultDatasetId) {
      // Format webhook Apify standard
      datasetId = body.resource.defaultDatasetId
    } else if (body.eventData && body.eventData.actorRunId) {
      // On peut aussi essayer de récupérer le dataset via l'API Apify en utilisant le run ID
      console.log('🔍 Attempting to get dataset from run ID:', body.eventData.actorRunId)
      
      const apifyApiKey = Deno.env.get('APIFY_API_KEY')
      if (!apifyApiKey) {
        console.error('❌ Apify API key not configured')
        return new Response(
          JSON.stringify({ error: 'Apify API key not configured' }), 
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Récupérer les infos du run pour obtenir le dataset ID
      const runResponse = await fetch(`https://api.apify.com/v2/actor-runs/${body.eventData.actorRunId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apifyApiKey}`,
          'Accept': 'application/json',
        },
      })

      if (runResponse.ok) {
        const runData = await runResponse.json()
        datasetId = runData.data.defaultDatasetId
        console.log('📋 Found dataset ID from run:', datasetId)
      }
    }

    if (!datasetId) {
      console.log('❌ No dataset ID found in webhook data:', Object.keys(body))
      return new Response(
        JSON.stringify({ 
          error: 'datasetId is required',
          receivedKeys: Object.keys(body),
          helpMessage: 'Send either { datasetId: "..." } or standard Apify webhook format'
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`📋 Processing dataset ID: ${datasetId}`)

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the Apify API key from environment
    const apifyApiKey = Deno.env.get('APIFY_API_KEY')
    if (!apifyApiKey) {
      console.error('❌ Apify API key not configured')
      return new Response(
        JSON.stringify({ error: 'Apify API key not configured' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Fetch dataset items from Apify
    console.log('🔄 Fetching dataset items from Apify...')
    const apifyResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&format=json`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apifyApiKey}`,
        'Accept': 'application/json',
      },
    })

    if (!apifyResponse.ok) {
      const errorText = await apifyResponse.text()
      console.error('❌ Apify API error:', apifyResponse.status, errorText)
      return new Response(
        JSON.stringify({ error: `Apify API error: ${apifyResponse.status}` }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const datasetItems = await apifyResponse.json()
    console.log(`📊 Retrieved ${datasetItems.length} items from dataset`)

    // Fetch clients for matching
    const { data: clients, error: clientsError } = await supabaseClient
      .from('clients')
      .select('id, company_name, company_linkedin_id')
      .eq('tracking_enabled', true)

    if (clientsError) {
      console.error('❌ Error fetching clients:', clientsError)
      return new Response(
        JSON.stringify({ error: 'Error fetching clients from database' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`👥 Found ${clients?.length || 0} tracked clients`)

    // Process and store job offers
    let processedCount = 0
    let skippedCount = 0
    let rawStoredCount = 0

    for (const item of datasetItems) {
      try {
        // Log de debug pour voir la structure des données
        console.log('🔄 Processing item:', JSON.stringify(item, null, 2))

        const companyName = item.companyName || item.company || null
        const jobUrl = item.link || item.url || null

        if (!jobUrl) {
          console.log('⚠️ Skipping item without URL')
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
        const { data: existingRawOffer } = await supabaseClient
          .from('client_job_offers_raw')
          .select('id')
          .eq('url', jobUrl)
          .single()

        if (!existingRawOffer) {
          const { error: rawInsertError } = await supabaseClient
            .from('client_job_offers_raw')
            .insert(rawJobOfferData)

          if (rawInsertError) {
            console.error('❌ Error inserting raw job offer:', rawInsertError)
            skippedCount++
            continue
          }

          rawStoredCount++
          console.log('✅ Stored raw job offer:', item.title || jobUrl)
        }

        // Filtrer les reposts - ne traiter que les offres qui ne sont PAS des reposts
        if (item.isReposted === true) {
          console.log('⚠️ Skipping reposted job offer:', item.title || jobUrl)
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

        console.log('📋 Prepared job offer data:', JSON.stringify(jobOfferData, null, 2))

        // Check if this job offer already exists in main table
        const { data: existingOffer } = await supabaseClient
          .from('client_job_offers')
          .select('id')
          .eq('url', jobUrl)
          .single()

        if (existingOffer) {
          console.log('⚠️ Job offer already exists, skipping:', item.title || jobUrl)
          skippedCount++
          continue
        }

        // Insert the job offer in main table
        const { error: insertError } = await supabaseClient
          .from('client_job_offers')
          .insert(jobOfferData)

        if (insertError) {
          console.error('❌ Error inserting job offer:', insertError)
          skippedCount++
          continue
        }

        console.log('✅ Inserted job offer:', item.title || jobUrl)
        processedCount++

      } catch (error) {
        console.error('❌ Error processing item:', error)
        skippedCount++
      }
    }

    console.log(`🎯 Processing complete: ${rawStoredCount} stored in raw, ${processedCount} processed, ${skippedCount} skipped`)
    
    // Répondre avec un 200 pour confirmer la réception et le traitement
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Dataset processed successfully',
        datasetId: datasetId,
        totalItems: datasetItems.length,
        rawStoredCount,
        processedCount,
        skippedCount,
        processedAt: new Date().toISOString()
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

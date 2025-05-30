
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
    console.log('Apify client jobs webhook received')
    
    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse the incoming webhook data
    const webhookData = await req.json()
    console.log('Apify client jobs webhook data:', JSON.stringify(webhookData, null, 2))

    // Extract the dataset ID from the webhook data
    const datasetId = webhookData.datasetId || 
                     webhookData.dataset_id || 
                     webhookData.id ||
                     webhookData.resource?.defaultDatasetId ||
                     webhookData.eventData?.datasetId
    
    if (!datasetId) {
      console.log('No dataset ID found in webhook data - this might be a test webhook')
      return new Response('OK - Test webhook received', { 
        status: 200,
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

    // Fetch ALL dataset items from Apify with pagination
    console.log('Fetching client job offers from Apify with pagination...')
    let allDatasetItems: any[] = []
    let offset = 0
    const limit = 1000
    let hasMoreData = true

    while (hasMoreData) {
      console.log(`Fetching items: offset=${offset}, limit=${limit}`)
      
      const apifyResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&format=json&offset=${offset}&limit=${limit}`, {
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

      const batchItems = await apifyResponse.json()
      console.log(`Retrieved ${batchItems.length} job offers in this batch`)
      
      if (batchItems.length < limit) {
        hasMoreData = false
      }
      
      allDatasetItems = allDatasetItems.concat(batchItems)
      offset += limit
      
      if (offset > 50000) {
        console.warn('Reached safety limit of 50k items, stopping pagination')
        hasMoreData = false
      }
    }

    console.log(`Total job offers retrieved: ${allDatasetItems.length}`)

    // Process the job offers data
    let processedCount = 0
    let filteredOutCount = 0

    for (const item of allDatasetItems) {
      try {
        // Check for required fields
        if (!item.url || !item.title) {
          console.log('Skipping job offer missing required fields:', item.title || 'unknown')
          filteredOutCount++
          continue
        }

        // Check if this job offer already exists (deduplication by URL)
        const { data: existingJob } = await supabaseClient
          .from('client_job_offers')
          .select('id')
          .eq('url', item.url)
          .single()

        if (existingJob) {
          console.log('Job offer already exists, skipping:', item.url)
          continue
        }

        // Try to match with a client based on company info
        let matchedClientId = null
        let matchedClientName = null

        if (item.company || item.companyName) {
          const companyName = item.company || item.companyName
          
          // Try to match with existing clients
          const { data: matchingClients } = await supabaseClient
            .from('clients')
            .select('id, company_name')
            .ilike('company_name', `%${companyName}%`)
            .limit(1)

          if (matchingClients && matchingClients.length > 0) {
            matchedClientId = matchingClients[0].id
            matchedClientName = matchingClients[0].company_name
            console.log(`Matched job offer with client: ${matchedClientName}`)
          }
        }

        // Prepare the data for insertion
        const jobOfferData = {
          apify_dataset_id: datasetId,
          title: item.title,
          company_name: item.company || item.companyName || null,
          url: item.url,
          location: item.location || null,
          job_type: item.jobType || item.type || null,
          salary: item.salary || null,
          description: item.description || null,
          posted_at: item.postedAt || item.publishedAt || null,
          matched_client_id: matchedClientId,
          matched_client_name: matchedClientName,
          raw_data: item
        }

        // Insert into database
        const { data: insertedJob, error: insertError } = await supabaseClient
          .from('client_job_offers')
          .insert(jobOfferData)
          .select('id')
          .single()

        if (insertError) {
          console.error('Error inserting job offer:', insertError)
          continue
        }

        console.log('Job offer inserted successfully:', insertedJob.id)
        processedCount++

      } catch (error) {
        console.error('Error processing job offer item:', error)
        filteredOutCount++
      }
    }

    console.log(`Processing complete: ${processedCount} inserted, ${filteredOutCount} filtered out from ${allDatasetItems.length} total items`)

    return new Response(JSON.stringify({ 
      success: true, 
      totalItems: allDatasetItems.length,
      processedCount,
      filteredOutCount,
      datasetId: datasetId
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in apify-client-jobs-webhook function:', error)
    return new Response('Internal server error', { 
      status: 500,
      headers: corsHeaders
    })
  }
})

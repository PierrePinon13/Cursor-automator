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
    console.log('Apify webhook received')
    
    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse the incoming webhook data
    const webhookData = await req.json()
    console.log('Apify webhook data:', JSON.stringify(webhookData, null, 2))

    // Extract the dataset ID from the webhook data - check multiple possible locations
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
    console.log('Dataset items retrieved successfully:', datasetItems.length, 'items')

    // Filter and process the data
    let processedCount = 0
    let filteredOutCount = 0

    for (const item of datasetItems) {
      try {
        // Filter 1: Only keep authorType = "Person"
        if (item.authorType !== 'Person') {
          filteredOutCount++
          continue
        }

        // Check for required fields
        if (!item.authorProfileUrl || !item.urn || !item.text) {
          console.log('Skipping item missing required fields:', item.urn || 'unknown')
          filteredOutCount++
          continue
        }

        // Check if this post already exists (deduplication by authorProfileUrl)
        const { data: existingPost } = await supabaseClient
          .from('linkedin_posts')
          .select('id')
          .eq('urn', item.urn)
          .single()

        if (existingPost) {
          console.log('Post already exists, skipping:', item.urn)
          continue
        }

        // Prepare the data for insertion
        const postData = {
          apify_dataset_id: datasetId,
          urn: item.urn,
          text: item.text,
          title: item.title || null,
          url: item.url,
          posted_at_timestamp: item.postedAtTimestamp || null,
          posted_at_iso: item.postedAt || null,
          author_type: item.authorType,
          author_profile_url: item.authorProfileUrl,
          author_profile_id: item.authorProfileId || null,
          author_name: item.authorName || null,
          author_headline: item.authorHeadline || null,
          processing_status: 'pending',
          raw_data: item
        }

        // Insert into database
        const { data: insertedPost, error: insertError } = await supabaseClient
          .from('linkedin_posts')
          .insert(postData)
          .select('id')
          .single()

        if (insertError) {
          console.error('Error inserting post:', insertError)
          continue
        }

        console.log('Post inserted successfully:', insertedPost.id)
        processedCount++

        // Trigger OpenAI processing (async)
        try {
          await supabaseClient.functions.invoke('process-linkedin-post', {
            body: { postId: insertedPost.id }
          })
        } catch (processingError) {
          console.error('Error triggering post processing:', processingError)
        }

      } catch (error) {
        console.error('Error processing item:', error)
        filteredOutCount++
      }
    }

    console.log(`Processing complete: ${processedCount} inserted, ${filteredOutCount} filtered out`)

    return new Response(JSON.stringify({ 
      success: true, 
      totalItems: datasetItems.length,
      processedCount,
      filteredOutCount,
      datasetId: datasetId
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in apify-webhook function:', error)
    return new Response('Internal server error', { 
      status: 500,
      headers: corsHeaders
    })
  }
})

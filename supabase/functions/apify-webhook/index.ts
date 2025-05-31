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

    // Initialize statistics tracking
    const stats = {
      dataset_id: datasetId,
      total_received: 0,
      after_person_filter: 0,
      after_repost_filter: 0,
      after_required_fields_filter: 0,
      after_deduplication: 0,
      successfully_inserted: 0,
      processing_errors: 0,
      started_at: new Date().toISOString()
    }

    // Fetch ALL dataset items from Apify with improved pagination
    console.log('🔄 Starting data retrieval with improved pagination...')
    let allDatasetItems: any[] = []
    let offset = 0
    const limit = 1000 // Apify's max per request
    let consecutiveEmptyBatches = 0
    const maxConsecutiveEmpty = 3 // Stop after 3 consecutive empty batches

    while (consecutiveEmptyBatches < maxConsecutiveEmpty) {
      console.log(`📥 Fetching batch: offset=${offset}, limit=${limit}`)
      
      try {
        const apifyResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&format=json&offset=${offset}&limit=${limit}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apifyApiKey}`,
            'Accept': 'application/json',
          },
        })

        if (!apifyResponse.ok) {
          const errorText = await apifyResponse.text()
          console.error('❌ Apify API error:', apifyResponse.status, errorText)
          throw new Error(`Apify API error: ${apifyResponse.status}`)
        }

        const batchItems = await apifyResponse.json()
        console.log(`📊 Retrieved ${batchItems.length} items in this batch`)
        
        // If we got no items, increment empty batch counter
        if (batchItems.length === 0) {
          consecutiveEmptyBatches++
          console.log(`⚠️ Empty batch ${consecutiveEmptyBatches}/${maxConsecutiveEmpty}`)
        } else {
          // Reset counter if we got data
          consecutiveEmptyBatches = 0
          allDatasetItems = allDatasetItems.concat(batchItems)
        }
        
        // If we got fewer items than the limit, we might be at the end
        if (batchItems.length < limit) {
          console.log('📄 Reached end of dataset (fewer items than limit)')
          break
        }
        
        // Update offset for next iteration
        offset += limit
        
        // Safety check to prevent infinite loops
        if (offset > 100000) { // Maximum 100k items as safety
          console.warn('⚠️ Reached safety limit of 100k items, stopping pagination')
          break
        }

      } catch (error) {
        console.error('❌ Error fetching batch:', error)
        consecutiveEmptyBatches++
        if (consecutiveEmptyBatches >= maxConsecutiveEmpty) {
          console.error('❌ Too many consecutive errors, stopping pagination')
          break
        }
      }
    }

    stats.total_received = allDatasetItems.length
    console.log(`📊 TOTAL dataset items retrieved: ${stats.total_received}`)

    // Apply filters and track statistics
    console.log('🔍 Starting filtering process...')

    // Filter 1: Only keep authorType = "Person"
    let filteredItems = allDatasetItems.filter(item => {
      if (item.authorType !== 'Person') {
        return false
      }
      return true
    })
    stats.after_person_filter = filteredItems.length
    console.log(`✅ After Person filter: ${stats.after_person_filter}/${stats.total_received} (${((stats.after_person_filter/stats.total_received)*100).toFixed(1)}%)`)

    // Filter 2: Only keep isRepost = false
    filteredItems = filteredItems.filter(item => {
      if (item.isRepost === true) {
        return false
      }
      return true
    })
    stats.after_repost_filter = filteredItems.length
    console.log(`✅ After Repost filter: ${stats.after_repost_filter}/${stats.after_person_filter} (${((stats.after_repost_filter/stats.after_person_filter)*100).toFixed(1)}%)`)

    // Filter 3: Check for required fields
    filteredItems = filteredItems.filter(item => {
      if (!item.authorProfileUrl || !item.urn || !item.text) {
        return false
      }
      return true
    })
    stats.after_required_fields_filter = filteredItems.length
    console.log(`✅ After Required fields filter: ${stats.after_required_fields_filter}/${stats.after_repost_filter} (${((stats.after_required_fields_filter/stats.after_repost_filter)*100).toFixed(1)}%)`)

    // Process remaining items
    let insertedCount = 0
    let deduplicatedCount = 0
    let errorCount = 0

    for (const item of filteredItems) {
      try {
        // Check if this post already exists (deduplication by urn)
        const { data: existingPost } = await supabaseClient
          .from('linkedin_posts')
          .select('id')
          .eq('urn', item.urn)
          .single()

        if (existingPost) {
          deduplicatedCount++
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
          console.error('❌ Error inserting post:', insertError)
          errorCount++
          continue
        }

        console.log('✅ Post inserted successfully:', insertedPost.id)
        insertedCount++

        // Trigger OpenAI processing (async)
        try {
          await supabaseClient.functions.invoke('process-linkedin-post', {
            body: { postId: insertedPost.id }
          })
        } catch (processingError) {
          console.error('⚠️ Error triggering post processing:', processingError)
        }

      } catch (error) {
        console.error('❌ Error processing item:', error)
        errorCount++
      }
    }

    // Update final statistics
    stats.after_deduplication = stats.after_required_fields_filter - deduplicatedCount
    stats.successfully_inserted = insertedCount
    stats.processing_errors = errorCount
    stats.completed_at = new Date().toISOString()

    // Store statistics in database
    try {
      await supabaseClient
        .from('apify_webhook_stats')
        .insert(stats)
      console.log('📊 Statistics saved to database')
    } catch (statsError) {
      console.error('⚠️ Error saving statistics:', statsError)
    }

    console.log(`🎯 Processing complete:
    📥 Total received: ${stats.total_received}
    👤 After Person filter: ${stats.after_person_filter}
    🔁 After Repost filter: ${stats.after_repost_filter}
    ✅ After Required fields: ${stats.after_required_fields_filter}
    🔍 After Deduplication: ${stats.after_deduplication}
    ✅ Successfully inserted: ${stats.successfully_inserted}
    ❌ Processing errors: ${stats.processing_errors}`)

    return new Response(JSON.stringify({ 
      success: true, 
      statistics: stats,
      filtersApplied: [
        'authorType = Person',
        'isRepost = false',
        'required fields present',
        'URN deduplication'
      ]
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Error in apify-webhook function:', error)
    return new Response('Internal server error', { 
      status: 500,
      headers: corsHeaders
    })
  }
})

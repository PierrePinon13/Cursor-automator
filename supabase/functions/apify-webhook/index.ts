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
      stored_raw: 0,
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

    // NOUVEAU: Stocker TOUTES les données brutes dans linkedin_posts_raw
    console.log('💾 Storing all raw data in linkedin_posts_raw table...')
    let rawStoredCount = 0
    let rawErrorCount = 0

    for (const item of allDatasetItems) {
      try {
        // Vérifier si ce post existe déjà dans la table raw (déduplication par URN)
        const { data: existingRawPost } = await supabaseClient
          .from('linkedin_posts_raw')
          .select('id')
          .eq('urn', item.urn)
          .single()

        if (existingRawPost) {
          console.log(`🔄 Raw post already exists: ${item.urn} - skipping`)
          continue
        }

        // Préparer les données pour l'insertion dans linkedin_posts_raw
        const rawPostData = {
          apify_dataset_id: datasetId,
          urn: item.urn,
          text: item.text || null,
          title: item.title || null,
          url: item.url,
          posted_at_timestamp: item.postedAtTimestamp || null,
          posted_at_iso: item.postedAt || null,
          author_type: item.authorType || null,
          author_profile_url: item.authorProfileUrl || null,
          author_profile_id: item.authorProfileId || null,
          author_name: item.authorName || null,
          author_headline: item.authorHeadline || null,
          is_repost: item.isRepost || false,
          raw_data: item
        }

        // Insérer dans linkedin_posts_raw
        const { error: rawInsertError } = await supabaseClient
          .from('linkedin_posts_raw')
          .insert(rawPostData)

        if (rawInsertError) {
          console.error('❌ Error inserting raw post:', rawInsertError)
          rawErrorCount++
          continue
        }

        console.log('✅ Raw post stored:', item.urn)
        rawStoredCount++

      } catch (error) {
        console.error('❌ Error processing raw item:', error)
        rawErrorCount++
      }
    }

    stats.stored_raw = rawStoredCount
    console.log(`💾 Raw storage complete: ${rawStoredCount} stored, ${rawErrorCount} errors`)

    // Continuer avec le traitement existant (avec filtres)
    console.log('🔍 Starting filtering process for linkedin_posts table...')

    // Filter 1: Only keep authorType = "Person"
    let filteredItems = allDatasetItems.filter(item => {
      const isPersonType = item.authorType === 'Person'
      if (!isPersonType) {
        console.log(`❌ Filtered out authorType: ${item.authorType} for post: ${item.urn}`)
      }
      return isPersonType
    })
    stats.after_person_filter = filteredItems.length
    console.log(`✅ After Person filter: ${stats.after_person_filter}/${stats.total_received} (${((stats.after_person_filter/stats.total_received)*100).toFixed(1)}%)`)

    // Filter 2: Only keep isRepost = false
    filteredItems = filteredItems.filter(item => {
      const isNotRepost = item.isRepost !== true
      if (!isNotRepost) {
        console.log(`❌ Filtered out repost: ${item.urn}`)
      }
      return isNotRepost
    })
    stats.after_repost_filter = filteredItems.length
    console.log(`✅ After Repost filter: ${stats.after_repost_filter}/${stats.after_person_filter} (${((stats.after_repost_filter/stats.after_person_filter)*100).toFixed(1)}%)`)

    // Filter 3: Only keep items with required fields (text, url, urn, authorProfileUrl)
    filteredItems = filteredItems.filter(item => {
      const hasRequiredFields = item.text && item.url && item.urn && item.authorProfileUrl
      if (!hasRequiredFields) {
        console.log(`❌ Filtered out item missing required fields: ${item.urn} - text: ${!!item.text}, url: ${!!item.url}, authorProfileUrl: ${!!item.authorProfileUrl}`)
      }
      return hasRequiredFields
    })
    stats.after_required_fields_filter = filteredItems.length
    console.log(`✅ After Required fields filter: ${stats.after_required_fields_filter}/${stats.after_repost_filter} (${((stats.after_required_fields_filter/stats.after_repost_filter)*100).toFixed(1)}%)`)

    // Process remaining items for linkedin_posts table
    let insertedCount = 0
    let deduplicatedCount = 0
    let errorCount = 0

    console.log(`🔄 Processing ${filteredItems.length} items for linkedin_posts insertion...`)

    for (const item of filteredItems) {
      try {
        // Check if this post already exists in linkedin_posts (deduplication by urn)
        const { data: existingPost } = await supabaseClient
          .from('linkedin_posts')
          .select('id')
          .eq('urn', item.urn)
          .maybeSingle()

        if (existingPost) {
          console.log(`🔄 Duplicate URN found in linkedin_posts: ${item.urn} - skipping`)
          deduplicatedCount++
          continue
        }

        // Prepare the data for insertion in linkedin_posts
        const postData = {
          apify_dataset_id: datasetId,
          urn: item.urn,
          text: item.text || 'No content',
          title: item.title || null,
          url: item.url,
          posted_at_timestamp: item.postedAtTimestamp || null,
          posted_at_iso: item.postedAt || null,
          author_type: item.authorType,
          author_profile_url: item.authorProfileUrl || 'Unknown',
          author_profile_id: item.authorProfileId || null,
          author_name: item.authorName || 'Unknown author',
          author_headline: item.authorHeadline || null,
          processing_status: 'pending',
          raw_data: item
        }

        console.log(`📝 Inserting post: ${item.urn}`)

        // Insert into linkedin_posts
        const { data: insertedPost, error: insertError } = await supabaseClient
          .from('linkedin_posts')
          .insert(postData)
          .select('id')
          .single()

        if (insertError) {
          console.error('❌ Error inserting post in linkedin_posts:', insertError)
          console.error('❌ Post data that failed:', JSON.stringify(postData, null, 2))
          errorCount++
          continue
        }

        console.log('✅ Post inserted in linkedin_posts successfully:', insertedPost.id)
        insertedCount++

        // Trigger OpenAI processing (async)
        try {
          console.log(`🚀 Triggering OpenAI processing for post: ${insertedPost.id}`)
          await supabaseClient.functions.invoke('process-linkedin-post', {
            body: { postId: insertedPost.id }
          })
          console.log(`✅ OpenAI processing triggered for post: ${insertedPost.id}`)
        } catch (processingError) {
          console.error('⚠️ Error triggering post processing:', processingError)
        }

      } catch (error) {
        console.error('❌ Error processing item for linkedin_posts:', error)
        console.error('❌ Item that caused error:', JSON.stringify(item, null, 2))
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
    💾 Stored raw: ${stats.stored_raw}
    👤 After Person filter: ${stats.after_person_filter}
    🔁 After Repost filter: ${stats.after_repost_filter}
    📋 After Required fields filter: ${stats.after_required_fields_filter}
    🔍 After Deduplication: ${stats.after_deduplication}
    ✅ Successfully inserted in linkedin_posts: ${stats.successfully_inserted}
    ❌ Processing errors: ${stats.processing_errors}`)

    return new Response(JSON.stringify({ 
      success: true, 
      statistics: stats,
      rawDataStored: true,
      filtersApplied: [
        'ALL data stored in linkedin_posts_raw',
        'authorType = Person (for linkedin_posts)',
        'isRepost = false (for linkedin_posts)',
        'Required fields validation (text, url, urn, authorProfileUrl)',
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

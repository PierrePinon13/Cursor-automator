
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Dataset reprocessing started')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { datasetId, cleanupExisting = false, webhook_triggered = false } = await req.json()
    
    if (!datasetId) {
      return new Response('Dataset ID is required', { 
        status: 400,
        headers: corsHeaders 
      })
    }

    console.log(`📊 ${webhook_triggered ? 'WEBHOOK' : 'MANUAL'} processing for dataset:`, datasetId)

    // Get the Apify API key
    const apifyApiKey = Deno.env.get('APIFY_API_KEY')
    if (!apifyApiKey) {
      return new Response('Apify API key not configured', { 
        status: 500,
        headers: corsHeaders 
      })
    }

    const stats = {
      dataset_id: datasetId,
      started_at: new Date().toISOString(),
      webhook_triggered,
      cleaned_existing: 0,
      total_fetched: 0,
      stored_raw: 0,
      queued_for_processing: 0,
      processing_errors: 0
    }

    // Phase 1: Cleanup existing data if requested
    if (cleanupExisting) {
      console.log('🧹 Cleaning up existing data for dataset:', datasetId)
      
      const { error: deletePostsError } = await supabaseClient
        .from('linkedin_posts')
        .delete()
        .eq('apify_dataset_id', datasetId)

      const { error: deleteRawError } = await supabaseClient
        .from('linkedin_posts_raw')
        .delete()
        .eq('apify_dataset_id', datasetId)

      if (deletePostsError || deleteRawError) {
        console.error('Cleanup errors:', { deletePostsError, deleteRawError })
      }

      console.log('✅ Cleanup completed')
    }

    // Phase 2: CORRECTED PAGINATION - Fetch ALL data following ChatGPT recommendations
    console.log('📥 Starting data retrieval with CORRECTED pagination...')
    let allDatasetItems: any[] = []
    const limit = 1000  // Fixed limit as recommended
    let offset = 0      // Start at 0

    while (true) {
      const batchNumber = Math.floor(offset / limit) + 1
      console.log(`📥 Fetching batch ${batchNumber}: offset=${offset}, limit=${limit}`)
      
      try {
        // Use ChatGPT's recommended URL pattern
        const apiUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?offset=${offset}&limit=${limit}&skipEmpty=true&desc=1`
        
        const apifyResponse = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apifyApiKey}`,
            'Accept': 'application/json',
          },
        })

        if (!apifyResponse.ok) {
          const errorText = await apifyResponse.text()
          console.error('❌ Apify API error:', apifyResponse.status, errorText)
          
          if (allDatasetItems.length > 0) {
            console.log('⚠️ API error but we have data, stopping...')
            break
          }
          throw new Error(`Apify API error: ${apifyResponse.status} - ${errorText}`)
        }

        const batchItems = await apifyResponse.json()
        console.log(`📊 Retrieved ${batchItems.length} items in batch ${batchNumber}`)
        
        // CORRECTED LOGIC: Stop if no data returned (as recommended by ChatGPT)
        if (!batchItems || batchItems.length === 0) {
          console.log('📄 No more items, pagination complete')
          break
        }

        allDatasetItems = allDatasetItems.concat(batchItems)
        
        // CORRECTED LOGIC: Always increment by limit (not by actual returned items)
        offset += limit
        
        console.log(`📊 Total items collected so far: ${allDatasetItems.length}`)

        // Optional: Add small delay to be respectful to Apify API
        if (batchItems.length === limit) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

      } catch (error) {
        console.error('❌ Error fetching batch:', error)
        if (allDatasetItems.length > 0) {
          console.log('⚠️ Error occurred but we have some data, stopping...')
          break
        }
        throw error
      }
    }

    stats.total_fetched = allDatasetItems.length
    console.log(`📊 FINAL: Total dataset items fetched: ${stats.total_fetched}`)

    // Phase 3: Store raw data (universal storage)
    console.log('💾 Storing raw data...')
    let rawStoredCount = 0

    for (const item of allDatasetItems) {
      try {
        // Check if this post already exists in raw table (deduplication by URN)
        const { data: existingRawPost } = await supabaseClient
          .from('linkedin_posts_raw')
          .select('id')
          .eq('urn', item.urn)
          .maybeSingle()

        if (existingRawPost) {
          console.log(`🔄 Raw post already exists: ${item.urn} - skipping`)
          continue
        }

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

        const { error: rawInsertError } = await supabaseClient
          .from('linkedin_posts_raw')
          .insert(rawPostData)

        if (rawInsertError) {
          console.error('❌ Error inserting raw post:', rawInsertError)
          continue
        }

        rawStoredCount++

      } catch (error) {
        console.error('❌ Error processing raw item:', error)
      }
    }

    stats.stored_raw = rawStoredCount

    // Phase 4: SIMPLIFIED qualification - Only exclude companies
    console.log('🎯 Applying SIMPLIFIED qualification (only exclude companies)...')
    let queuedCount = 0

    for (const item of allDatasetItems) {
      try {
        // Check if this post already exists in linkedin_posts
        const { data: existingPost } = await supabaseClient
          .from('linkedin_posts')
          .select('id')
          .eq('urn', item.urn)
          .maybeSingle()

        if (existingPost) {
          console.log(`🔄 Post already in processing queue: ${item.urn} - skipping`)
          continue
        }

        // SIMPLIFIED Classification - Only exclude companies
        const shouldProcess = classifyForProcessingSimplified(item)
        
        if (!shouldProcess.process) {
          console.log(`⏭️ Post excluded: ${item.urn} - Reason: ${shouldProcess.reason}`)
          continue
        }

        const postData = {
          apify_dataset_id: datasetId,
          urn: item.urn,
          text: item.text || 'Content unavailable',
          title: item.title || null,
          url: item.url,
          posted_at_timestamp: item.postedAtTimestamp || null,
          posted_at_iso: item.postedAt || null,
          author_type: item.authorType,
          author_profile_url: item.authorProfileUrl || 'Unknown',
          author_profile_id: item.authorProfileId || null,
          author_name: item.authorName || 'Unknown author',
          author_headline: item.authorHeadline || null,
          processing_status: 'queued',
          raw_data: item,
          processing_priority: shouldProcess.priority
        }

        const { data: insertedPost, error: insertError } = await supabaseClient
          .from('linkedin_posts')
          .insert(postData)
          .select('id')
          .single()

        if (insertError) {
          console.error('❌ Error queuing post:', insertError)
          continue
        }

        queuedCount++

        // Trigger processing asynchronously
        supabaseClient.functions.invoke('process-linkedin-post', {
          body: { postId: insertedPost.id, datasetId: datasetId }
        }).catch(err => {
          console.error('⚠️ Error triggering processing:', err)
        })

      } catch (error) {
        console.error('❌ Error during qualification:', error)
      }
    }

    stats.queued_for_processing = queuedCount
    stats.completed_at = new Date().toISOString()

    // Store processing statistics
    await supabaseClient
      .from('apify_webhook_stats')
      .insert({
        ...stats,
        reprocessing: !webhook_triggered,
        classification_success_rate: stats.total_fetched > 0 ? 
          ((stats.queued_for_processing / stats.total_fetched) * 100).toFixed(2) : 0,
        storage_success_rate: stats.total_fetched > 0 ? 
          ((stats.stored_raw / stats.total_fetched) * 100).toFixed(2) : 0
      })

    console.log(`🎯 PROCESSING COMPLETE:
    📊 Dataset ID: ${datasetId}
    📥 Total fetched: ${stats.total_fetched}
    💾 Stored raw: ${stats.stored_raw}
    🎯 Queued for processing: ${stats.queued_for_processing}
    ${webhook_triggered ? '🔔 Triggered by webhook' : '🔧 Manual reprocessing'}`)

    return new Response(JSON.stringify({ 
      success: true,
      action: webhook_triggered ? 'webhook_dataset_processing' : 'dataset_reprocessing',
      dataset_id: datasetId,
      statistics: stats,
      improvements: [
        'CORRECTED pagination following ChatGPT recommendations',
        'Always increment offset by limit (not by returned items)',
        'Stop when no data returned (not after consecutive empty batches)',
        webhook_triggered ? 'Fast webhook response architecture' : 'Manual reprocessing',
        'SIMPLIFIED classification: only exclude Company authors',
        'Enhanced error handling and recovery mechanisms'
      ]
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Error in reprocess-dataset function:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// SIMPLIFIED Classification function - Only exclude companies
function classifyForProcessingSimplified(item: any) {
  // Critical fields check
  if (!item.urn) {
    return { process: false, reason: 'Missing URN (critical)', priority: 0 }
  }

  if (!item.url) {
    return { process: false, reason: 'Missing URL (critical)', priority: 0 }
  }

  // ONLY ONE FILTER: Exclude companies
  if (item.authorType === 'Company') {
    return { process: false, reason: 'Author is company (excluded)', priority: 0 }
  }

  // Accept everything else
  return { process: true, reason: 'Accepted for processing', priority: 1 }
}

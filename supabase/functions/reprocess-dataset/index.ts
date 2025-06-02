
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

    const { datasetId, cleanupExisting = false } = await req.json()
    
    if (!datasetId) {
      return new Response('Dataset ID is required', { 
        status: 400,
        headers: corsHeaders 
      })
    }

    console.log('📊 Reprocessing dataset:', datasetId)

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
      cleaned_existing: 0,
      total_fetched: 0,
      stored_raw: 0,
      queued_for_processing: 0,
      processing_errors: 0
    }

    // Phase 1: Cleanup existing data if requested
    if (cleanupExisting) {
      console.log('🧹 Cleaning up existing data for dataset:', datasetId)
      
      // Delete from linkedin_posts
      const { error: deletePostsError } = await supabaseClient
        .from('linkedin_posts')
        .delete()
        .eq('apify_dataset_id', datasetId)

      if (deletePostsError) {
        console.error('Error deleting existing posts:', deletePostsError)
      }

      // Delete from linkedin_posts_raw
      const { error: deleteRawError } = await supabaseClient
        .from('linkedin_posts_raw')
        .delete()
        .eq('apify_dataset_id', datasetId)

      if (deleteRawError) {
        console.error('Error deleting existing raw posts:', deleteRawError)
      }

      console.log('✅ Cleanup completed')
    }

    // Phase 2: Fetch ALL data with improved pagination
    console.log('📥 Starting comprehensive data retrieval with corrected pagination...')
    let allDatasetItems: any[] = []
    let offset = 0
    const limit = 1000
    let totalAttempts = 0
    const maxAttempts = 20

    while (totalAttempts < maxAttempts) {
      console.log(`📥 Fetching batch ${totalAttempts + 1}: offset=${offset}, limit=${limit}`)
      
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
          
          if (allDatasetItems.length > 0) {
            console.log('⚠️ API error but we have data, continuing...')
            break
          }
          throw new Error(`Apify API error: ${apifyResponse.status}`)
        }

        const batchItems = await apifyResponse.json()
        console.log(`📊 Retrieved ${batchItems.length} items in batch ${totalAttempts + 1}`)
        
        if (batchItems.length === 0) {
          console.log('📄 No more items, stopping pagination')
          break
        }

        allDatasetItems = allDatasetItems.concat(batchItems)
        offset += batchItems.length
        totalAttempts++
        
        if (batchItems.length < limit) {
          console.log('📄 Reached end of dataset (partial batch)')
          break
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
    console.log(`📊 TOTAL dataset items fetched: ${stats.total_fetched}`)

    // Phase 3: Store raw data (universal storage)
    console.log('💾 Storing raw data...')
    let rawStoredCount = 0

    for (const item of allDatasetItems) {
      try {
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

    // Phase 4: Apply corrected classification and queue for processing
    console.log('🎯 Applying corrected classification...')
    let queuedCount = 0

    for (const item of allDatasetItems) {
      try {
        const shouldProcess = classifyForProcessingFixed(item)
        
        if (!shouldProcess.process) {
          console.log(`⏭️ Post classified as skip: ${item.urn} - Reason: ${shouldProcess.reason}`)
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

    // Store reprocessing statistics
    await supabaseClient
      .from('apify_webhook_stats')
      .insert({
        ...stats,
        reprocessing: true,
        classification_success_rate: stats.total_fetched > 0 ? 
          ((stats.queued_for_processing / stats.total_fetched) * 100).toFixed(2) : 0,
        storage_success_rate: stats.total_fetched > 0 ? 
          ((stats.stored_raw / stats.total_fetched) * 100).toFixed(2) : 0
      })

    console.log(`🎯 REPROCESSING COMPLETE:
    📊 Dataset ID: ${datasetId}
    📥 Total fetched: ${stats.total_fetched}
    💾 Stored raw: ${stats.stored_raw}
    🎯 Queued for processing: ${stats.queued_for_processing}`)

    return new Response(JSON.stringify({ 
      success: true,
      action: 'dataset_reprocessing',
      dataset_id: datasetId,
      statistics: stats,
      improvements: [
        'Complete dataset re-fetch with corrected pagination',
        'Fixed classification logic (less strict)',
        'Universal raw data storage',
        'Proper error handling and recovery'
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

// Classification function with corrected logic
function classifyForProcessingFixed(item: any) {
  if (!item.urn) {
    return { process: false, reason: 'Missing URN (critical)', priority: 0 }
  }

  if (!item.url) {
    return { process: false, reason: 'Missing URL (critical)', priority: 0 }
  }

  if (item.isRepost === true) {
    return { process: false, reason: 'Is repost', priority: 0 }
  }

  // Maintenir l'exclusion des companies
  if (item.authorType === 'Company') {
    return { process: false, reason: 'Author is company (excluded)', priority: 0 }
  }

  // Priorité haute : Posts récents
  if (item.postedAtTimestamp) {
    const postAge = Date.now() - (item.postedAtTimestamp || 0)
    const dayInMs = 24 * 60 * 60 * 1000
    
    if (postAge < dayInMs) {
      return { process: true, reason: 'Recent post', priority: 1 }
    }
    
    if (postAge < 7 * dayInMs) {
      return { process: true, reason: 'Week-old post', priority: 2 }
    }
    
    return { process: true, reason: 'Older post', priority: 3 }
  }

  // Priorité moyenne : Posts avec nom d'auteur
  if (item.authorName) {
    return { process: true, reason: 'Post with author name', priority: 4 }
  }

  // Accepter presque tout le reste
  return { process: true, reason: 'Generic post', priority: 5 }
}

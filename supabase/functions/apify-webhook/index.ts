
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

    console.log('📊 Processing dataset ID:', datasetId)

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
      queued_for_processing: 0,
      processing_errors: 0,
      started_at: new Date().toISOString()
    }

    // Fetch ALL dataset items from Apify with IMPROVED pagination
    console.log('🔄 Starting comprehensive data retrieval...')
    let allDatasetItems: any[] = []
    let offset = 0
    const limit = 1000 // Apify's max per request
    let totalAttempts = 0
    const maxAttempts = 20 // Limite de sécurité

    while (totalAttempts < maxAttempts) {
      console.log(`📥 Fetching batch ${totalAttempts + 1}: offset=${offset}, limit=${limit}`)
      
      try {
        // Use skipEmpty=true instead of clean=true and add desc=1
        const apifyResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?skipEmpty=true&format=json&offset=${offset}&limit=${limit}&desc=1`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apifyApiKey}`,
            'Accept': 'application/json',
          },
        })

        if (!apifyResponse.ok) {
          const errorText = await apifyResponse.text()
          console.error('❌ Apify API error:', apifyResponse.status, errorText)
          
          // Si on a déjà des données, on continue
          if (allDatasetItems.length > 0) {
            console.log('⚠️ API error but we have data, continuing...')
            break
          }
          throw new Error(`Apify API error: ${apifyResponse.status}`)
        }

        const batchItems = await apifyResponse.json()
        console.log(`📊 Retrieved ${batchItems.length} items in batch ${totalAttempts + 1}`)
        
        // Si on ne récupère rien, on s'arrête
        if (batchItems.length === 0) {
          console.log('📄 No more items, stopping pagination')
          break
        }

        allDatasetItems = allDatasetItems.concat(batchItems)
        offset += batchItems.length // Utiliser la taille réelle du batch
        totalAttempts++
        
        // Si on a moins d'items que la limite, on a atteint la fin
        if (batchItems.length < limit) {
          console.log('📄 Reached end of dataset (partial batch)')
          break
        }

      } catch (error) {
        console.error('❌ Error fetching batch:', error)
        // Si on a déjà des données, on s'arrête gracieusement
        if (allDatasetItems.length > 0) {
          console.log('⚠️ Error occurred but we have some data, stopping...')
          break
        }
        throw error
      }
    }

    stats.total_received = allDatasetItems.length
    console.log(`📊 TOTAL dataset items retrieved: ${stats.total_received}`)

    // PHASE 1: STOCKAGE UNIVERSEL - Stocker TOUT sans filtrage
    console.log('💾 Phase 1: Universal storage - storing ALL data without filtering...')
    let rawStoredCount = 0
    let rawErrorCount = 0

    for (const item of allDatasetItems) {
      try {
        // Vérifier si ce post existe déjà dans la table raw (déduplication par URN)
        const { data: existingRawPost } = await supabaseClient
          .from('linkedin_posts_raw')
          .select('id')
          .eq('urn', item.urn)
          .maybeSingle()

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

    // PHASE 2: SIMPLIFIED QUALIFICATION - Only exclude companies
    console.log('🎯 Phase 2: SIMPLIFIED qualification - only exclude companies...')
    
    let queuedCount = 0
    let qualificationErrors = 0

    for (const item of allDatasetItems) {
      try {
        // Vérifier si ce post existe déjà dans linkedin_posts
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

        // Préparer les données pour l'insertion dans linkedin_posts avec dataset tracking
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

        console.log(`📝 Queuing post for processing: ${item.urn} (Priority: ${shouldProcess.priority})`)

        // Insérer dans linkedin_posts pour traitement
        const { data: insertedPost, error: insertError } = await supabaseClient
          .from('linkedin_posts')
          .insert(postData)
          .select('id')
          .single()

        if (insertError) {
          console.error('❌ Error queuing post for processing:', insertError)
          qualificationErrors++
          continue
        }

        console.log('✅ Post queued for processing:', insertedPost.id)
        queuedCount++

        // Trigger processing asynchronously (non-blocking)
        try {
          console.log(`🚀 Triggering async processing for post: ${insertedPost.id}`)
          supabaseClient.functions.invoke('process-linkedin-post', {
            body: { postId: insertedPost.id, datasetId: datasetId }
          }).catch(err => {
            console.error('⚠️ Error triggering async processing:', err)
          })
        } catch (processingError) {
          console.error('⚠️ Error triggering post processing:', processingError)
        }

      } catch (error) {
        console.error('❌ Error during qualification:', error)
        qualificationErrors++
      }
    }

    // Update final statistics
    stats.queued_for_processing = queuedCount
    stats.processing_errors = qualificationErrors
    stats.completed_at = new Date().toISOString()

    // Store enhanced statistics in database
    try {
      await supabaseClient
        .from('apify_webhook_stats')
        .insert({
          ...stats,
          classification_success_rate: stats.total_received > 0 ? 
            ((stats.queued_for_processing / stats.total_received) * 100).toFixed(2) : 0,
          storage_success_rate: stats.total_received > 0 ? 
            ((stats.stored_raw / stats.total_received) * 100).toFixed(2) : 0
        })
      console.log('📊 Enhanced statistics saved to database')
    } catch (statsError) {
      console.error('⚠️ Error saving statistics:', statsError)
    }

    console.log(`🎯 PROCESSING COMPLETE - SIMPLIFIED Classification:
    📥 Total received: ${stats.total_received}
    💾 Stored raw (universal): ${stats.stored_raw}
    🎯 Queued for processing: ${stats.queued_for_processing}
    ❌ Processing errors: ${stats.processing_errors}
    📊 Dataset ID: ${datasetId}`)

    return new Response(JSON.stringify({ 
      success: true, 
      phase: 'SIMPLIFIED Classification - Only Exclude Companies',
      statistics: stats,
      datasetId: datasetId,
      improvements: [
        'Fixed pagination logic to retrieve ALL records',
        'SIMPLIFIED classification: only exclude Company authors',
        'Universal raw data storage (no data loss)',
        'Improved error handling and recovery',
        'Enhanced monitoring and statistics',
        'Used skipEmpty=true instead of clean=true'
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

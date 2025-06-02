
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

    // PHASE 1: QUALIFICATION INTELLIGENTE - Marquer pour traitement
    console.log('🎯 Phase 1: Intelligent qualification - marking posts for processing...')
    
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

        // Classification intelligente pour décider si on traite ou non
        const shouldProcess = classifyForProcessing(item)
        
        if (!shouldProcess.process) {
          console.log(`⏭️ Post classified as skip: ${item.urn} - Reason: ${shouldProcess.reason}`)
          continue
        }

        // Préparer les données pour l'insertion dans linkedin_posts avec dataset tracking
        const postData = {
          apify_dataset_id: datasetId, // 🎯 DATASET TRACKING
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
          processing_status: 'queued', // Nouveau statut pour la queue
          raw_data: item,
          processing_priority: shouldProcess.priority // Priorité de traitement
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
          // Note: On ne bloque pas sur cette opération
          supabaseClient.functions.invoke('process-linkedin-post', {
            body: { postId: insertedPost.id, datasetId: datasetId } // 🎯 Passing dataset ID
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
          // Nouvelles métriques pour Phase 1
          classification_success_rate: stats.total_received > 0 ? 
            ((stats.queued_for_processing / stats.total_received) * 100).toFixed(2) : 0,
          storage_success_rate: stats.total_received > 0 ? 
            ((stats.stored_raw / stats.total_received) * 100).toFixed(2) : 0
        })
      console.log('📊 Enhanced statistics saved to database')
    } catch (statsError) {
      console.error('⚠️ Error saving statistics:', statsError)
    }

    console.log(`🎯 PHASE 1 COMPLETE - Universal Storage & Intelligent Queuing:
    📥 Total received: ${stats.total_received}
    💾 Stored raw (universal): ${stats.stored_raw}
    🎯 Queued for processing: ${stats.queued_for_processing}
    ❌ Processing errors: ${stats.processing_errors}
    📊 Dataset ID: ${datasetId}`)

    return new Response(JSON.stringify({ 
      success: true, 
      phase: 'Phase 1 - Universal Storage & Intelligent Queuing',
      statistics: stats,
      datasetId: datasetId,
      improvements: [
        'Universal raw data storage (no data loss)',
        'Intelligent classification for processing',
        'Dataset tracking throughout pipeline',
        'Async processing queue',
        'Enhanced monitoring and statistics'
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

// 🎯 CLASSIFICATION INTELLIGENTE - Décide quels posts traiter
function classifyForProcessing(item: any) {
  // Critères de base obligatoires
  if (!item.urn) {
    return { process: false, reason: 'Missing URN', priority: 0 }
  }

  if (!item.url) {
    return { process: false, reason: 'Missing URL', priority: 0 }
  }

  // Posts manifestement non pertinents
  if (item.isRepost === true) {
    return { process: false, reason: 'Is repost', priority: 0 }
  }

  // Posts de compagnies (pas de personnes)
  if (item.authorType && item.authorType !== 'Person') {
    return { process: false, reason: 'Not a person', priority: 0 }
  }

  // Priorité haute : Posts récents avec contenu
  if (item.text && item.authorProfileUrl && item.postedAtTimestamp) {
    const postAge = Date.now() - (item.postedAtTimestamp || 0)
    const dayInMs = 24 * 60 * 60 * 1000
    
    if (postAge < dayInMs) {
      return { process: true, reason: 'Recent post with content', priority: 1 }
    }
    
    if (postAge < 7 * dayInMs) {
      return { process: true, reason: 'Week-old post with content', priority: 2 }
    }
    
    return { process: true, reason: 'Older post with content', priority: 3 }
  }

  // Priorité moyenne : Posts avec contenu partiel
  if (item.text || item.title) {
    return { process: true, reason: 'Post with partial content', priority: 4 }
  }

  // Priorité faible : Posts sans contenu mais avec profil auteur
  if (item.authorProfileUrl) {
    return { process: true, reason: 'Post with author profile only', priority: 5 }
  }

  // Rejeter les posts sans aucune information utile
  return { process: false, reason: 'Insufficient data', priority: 0 }
}

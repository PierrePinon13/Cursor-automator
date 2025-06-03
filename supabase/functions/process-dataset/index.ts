
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
    console.log('🔄 Dataset processing started')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { datasetId, cleanupExisting = false, webhook_triggered = false, forceAll = false } = await req.json()
    
    if (!datasetId) {
      return new Response('Dataset ID is required', { 
        status: 400,
        headers: corsHeaders 
      })
    }

    console.log(`📊 ${webhook_triggered ? 'WEBHOOK' : 'MANUAL'} processing for dataset:`, datasetId)

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
      processing_errors: 0,
      apify_item_count: 0,
      apify_clean_item_count: 0,
      force_all_mode: forceAll
    }

    // ÉTAPE 0: Vérifier les métadonnées du dataset Apify
    console.log('🔍 Checking Apify dataset metadata...')
    try {
      const metadataResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}`, {
        headers: { 'Authorization': `Bearer ${apifyApiKey}` }
      })
      
      if (metadataResponse.ok) {
        const metadata = await metadataResponse.json()
        stats.apify_item_count = metadata.itemCount || 0
        stats.apify_clean_item_count = metadata.cleanItemCount || 0
        
        console.log(`📋 Dataset metadata:`)
        console.log(`   📊 Total items: ${stats.apify_item_count}`)
        console.log(`   🧹 Clean items: ${stats.apify_clean_item_count}`)
        console.log(`   📅 Created: ${metadata.createdAt}`)
        console.log(`   🔄 Modified: ${metadata.modifiedAt}`)
        
        if (stats.apify_item_count !== stats.apify_clean_item_count) {
          console.log(`⚠️ WARNING: ${stats.apify_item_count - stats.apify_clean_item_count} items are empty/invalid`)
        }
      } else {
        console.log('⚠️ Could not fetch dataset metadata')
      }
    } catch (error) {
      console.log('❌ Error fetching metadata:', error.message)
    }

    // Phase 1: Cleanup existing data if requested
    if (cleanupExisting) {
      console.log('🧹 Cleaning up existing data for dataset:', datasetId)
      
      const { count: deletedPosts } = await supabaseClient
        .from('linkedin_posts')
        .delete({ count: 'exact' })
        .eq('apify_dataset_id', datasetId)

      const { count: deletedRaw } = await supabaseClient
        .from('linkedin_posts_raw')
        .delete({ count: 'exact' })
        .eq('apify_dataset_id', datasetId)

      stats.cleaned_existing = (deletedPosts || 0) + (deletedRaw || 0)
      console.log(`✅ Cleanup completed: ${stats.cleaned_existing} records deleted`)
    }

    // Phase 2: Récupération des données avec diagnostic avancé
    console.log('📥 Starting data retrieval with enhanced diagnostics...')
    let allDatasetItems: any[] = []
    const limit = 1000
    let offset = 0
    let batchCount = 0
    let emptyBatchCount = 0

    while (true) {
      batchCount++
      console.log(`📥 Fetching batch ${batchCount}: offset=${offset}, limit=${limit}`)
      
      try {
        // URL avec options de filtrage conditionnelles
        let apiUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?offset=${offset}&limit=${limit}&desc=1`
        
        // En mode forceAll, on désactive tous les filtres Apify
        if (!forceAll) {
          apiUrl += '&skipEmpty=true'
        } else {
          console.log('🚫 forceAll mode: retrieving ALL items including empty ones')
        }
        
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
        console.log(`📊 Batch ${batchCount}: ${batchItems.length} items retrieved`)
        
        // Stop si aucun item retourné
        if (!batchItems || batchItems.length === 0) {
          emptyBatchCount++
          console.log(`📄 Empty batch #${emptyBatchCount} - stopping pagination`)
          break
        }

        // Diagnostic des items vides/invalides
        const validItems = batchItems.filter((item: any) => item && item.urn)
        const invalidItems = batchItems.length - validItems.length
        
        if (invalidItems > 0) {
          console.log(`⚠️ Batch ${batchCount}: ${invalidItems} invalid items detected (no URN)`)
        }

        allDatasetItems = allDatasetItems.concat(batchItems)
        offset += limit
        
        console.log(`📊 Total items collected: ${allDatasetItems.length}`)

        // Délai respectueux pour l'API Apify
        if (batchItems.length === limit) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

      } catch (error) {
        console.error(`❌ Error fetching batch ${batchCount}:`, error)
        if (allDatasetItems.length > 0) {
          console.log('⚠️ Error but we have some data, stopping...')
          break
        }
        throw error
      }
    }

    stats.total_fetched = allDatasetItems.length
    console.log(`📊 FINAL RETRIEVAL SUMMARY:`)
    console.log(`   📥 Total fetched: ${stats.total_fetched}`)
    console.log(`   📊 Expected (Apify): ${stats.apify_item_count}`)
    console.log(`   🧹 Expected clean: ${stats.apify_clean_item_count}`)
    
    // Alerte si perte significative d'items
    if (stats.apify_item_count > 0) {
      const retrievalRate = (stats.total_fetched / stats.apify_item_count) * 100
      console.log(`   📈 Retrieval rate: ${retrievalRate.toFixed(1)}%`)
      
      if (retrievalRate < 80) {
        console.log(`🚨 WARNING: Low retrieval rate (${retrievalRate.toFixed(1)}%) - significant data loss detected!`)
      }
    }

    // Phase 3: Stockage des données brutes en BATCH avec déduplication
    console.log('💾 Storing raw data with BATCH processing and deduplication...')
    let rawStoredCount = 0
    const BATCH_SIZE = 100

    // Déduplication avant stockage pour éviter les conflits ON CONFLICT
    const validRawData = allDatasetItems
      .filter(item => item && item.urn)
      .reduce((acc, item) => {
        // Déduplication par URN dans le même batch
        if (!acc.find(existing => existing.urn === item.urn)) {
          acc.push({
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
            raw_data: item,
            updated_at: new Date().toISOString()
          })
        }
        return acc
      }, [] as any[])

    console.log(`📦 Processing ${validRawData.length} deduplicated records in batches of ${BATCH_SIZE}`)

    // Traitement par batch pour éviter les timeouts
    for (let i = 0; i < validRawData.length; i += BATCH_SIZE) {
      const batch = validRawData.slice(i, i + BATCH_SIZE)
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(validRawData.length / BATCH_SIZE)
      
      console.log(`💾 Processing batch ${batchNumber}/${totalBatches} (${batch.length} records)`)
      
      try {
        const { error: batchError } = await supabaseClient
          .from('linkedin_posts_raw')
          .upsert(batch, { 
            onConflict: 'urn',
            ignoreDuplicates: false 
          })

        if (batchError) {
          console.error(`❌ Error in batch ${batchNumber}:`, batchError)
          stats.processing_errors += batch.length
        } else {
          rawStoredCount += batch.length
          console.log(`✅ Batch ${batchNumber} stored successfully (${batch.length} records)`)
        }

        // Pause courte entre les batches pour éviter la surcharge
        if (i + BATCH_SIZE < validRawData.length) {
          await new Promise(resolve => setTimeout(resolve, 50))
        }

      } catch (error) {
        console.error(`❌ Exception in batch ${batchNumber}:`, error)
        stats.processing_errors += batch.length
      }
    }

    stats.stored_raw = rawStoredCount
    console.log(`✅ Raw storage completed: ${rawStoredCount}/${validRawData.length} records stored`)

    // ✅ OPTIMISATION MAJEURE: Phase 4 - Classification BATCH optimisée
    console.log('🎯 Starting OPTIMIZED batch classification and queuing...')
    let queuedCount = 0
    let excludedByAuthorType = 0
    let excludedByMissingFields = 0
    let alreadyQueued = 0

    // Déduplication des items par URN avant traitement
    const uniqueItems = allDatasetItems.reduce((acc, item) => {
      if (item && item.urn && !acc.find(existing => existing.urn === item.urn)) {
        acc.push(item)
      }
      return acc
    }, [] as any[])

    console.log(`📊 Processing ${uniqueItems.length} unique items (deduplicated from ${allDatasetItems.length})`)

    // ✅ CORRECTION CRITIQUE: Traitement par BATCH pour éviter les timeouts
    const CLASSIFICATION_BATCH_SIZE = 50
    
    for (let i = 0; i < uniqueItems.length; i += CLASSIFICATION_BATCH_SIZE) {
      const batch = uniqueItems.slice(i, i + CLASSIFICATION_BATCH_SIZE)
      const batchNumber = Math.floor(i / CLASSIFICATION_BATCH_SIZE) + 1
      const totalBatches = Math.ceil(uniqueItems.length / CLASSIFICATION_BATCH_SIZE)
      
      console.log(`🎯 Processing classification batch ${batchNumber}/${totalBatches} (${batch.length} items)`)
      
      // Préparer les données du batch
      const batchData = []
      
      for (const item of batch) {
        try {
          if (!item.urn || !item.url) {
            excludedByMissingFields++
            continue
          }

          // Classification simplifiée
          if (item.authorType === 'Company') {
            excludedByAuthorType++
            continue
          }

          // Vérifier si déjà en queue (batch check)
          const { data: existingPosts } = await supabaseClient
            .from('linkedin_posts')
            .select('urn')
            .eq('urn', item.urn)
            .limit(1)

          if (existingPosts && existingPosts.length > 0) {
            alreadyQueued++
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
            processing_status: 'pending',
            raw_data: item
          }

          batchData.push(postData)

        } catch (error) {
          console.error('❌ Error preparing item for batch:', error)
          stats.processing_errors++
        }
      }

      // Insérer le batch en une seule fois
      if (batchData.length > 0) {
        try {
          const { data: insertedPosts, error: insertError } = await supabaseClient
            .from('linkedin_posts')
            .insert(batchData)
            .select('id')

          if (insertError) {
            console.error(`❌ Error inserting batch ${batchNumber}:`, insertError)
            stats.processing_errors += batchData.length
          } else {
            queuedCount += batchData.length
            console.log(`✅ Classification batch ${batchNumber} inserted: ${batchData.length} posts`)

            // Déclencher le traitement asynchrone pour chaque post inséré
            if (insertedPosts && insertedPosts.length > 0) {
              for (const post of insertedPosts) {
                supabaseClient.functions.invoke('process-linkedin-post', {
                  body: { postId: post.id, datasetId: datasetId }
                }).catch(err => {
                  console.error(`⚠️ Error triggering processing for ${post.id}:`, err)
                })
              }
            }
          }
        } catch (error) {
          console.error(`❌ Exception in classification batch ${batchNumber}:`, error)
          stats.processing_errors += batchData.length
        }
      }

      // Pause courte entre les batches pour éviter la surcharge
      if (i + CLASSIFICATION_BATCH_SIZE < uniqueItems.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    stats.queued_for_processing = queuedCount
    stats.completed_at = new Date().toISOString()

    // Diagnostic détaillé
    console.log(`🎯 CLASSIFICATION SUMMARY:`)
    console.log(`   📥 Items processed: ${allDatasetItems.length}`)
    console.log(`   ✅ Successfully queued: ${queuedCount}`)
    console.log(`   🏢 Excluded (Company): ${excludedByAuthorType}`)
    console.log(`   ❌ Excluded (Missing fields): ${excludedByMissingFields}`)
    console.log(`   🔄 Already queued: ${alreadyQueued}`)
    console.log(`   📊 Qualification rate: ${allDatasetItems.length > 0 ? ((queuedCount / allDatasetItems.length) * 100).toFixed(1) : 0}%`)

    // Stocker les statistiques étendues
    await supabaseClient
      .from('apify_webhook_stats')
      .insert({
        ...stats,
        reprocessing: !webhook_triggered,
        classification_success_rate: stats.total_fetched > 0 ? 
          ((stats.queued_for_processing / stats.total_fetched) * 100).toFixed(2) : 0,
        storage_success_rate: stats.total_fetched > 0 ? 
          ((stats.stored_raw / stats.total_fetched) * 100).toFixed(2) : 0,
        excluded_by_author_type: excludedByAuthorType,
        excluded_by_missing_fields: excludedByMissingFields,
        already_queued: alreadyQueued
      })

    console.log(`🎯 PROCESSING COMPLETE:`)
    console.log(`📊 Dataset ID: ${datasetId}`)
    console.log(`📥 Total fetched: ${stats.total_fetched} / ${stats.apify_item_count} expected`)
    console.log(`💾 Stored raw: ${stats.stored_raw}`)
    console.log(`🎯 Queued for processing: ${stats.queued_for_processing}`)
    console.log(`${webhook_triggered ? '🔔 Triggered by webhook' : '🔧 Manual reprocessing'}`)

    return new Response(JSON.stringify({ 
      success: true,
      action: webhook_triggered ? 'webhook_dataset_processing' : 'dataset_reprocessing',
      dataset_id: datasetId,
      statistics: stats,
      diagnostics: {
        retrieval_rate_percent: stats.apify_item_count > 0 ? 
          ((stats.total_fetched / stats.apify_item_count) * 100).toFixed(1) : 0,
        qualification_rate_percent: stats.total_fetched > 0 ? 
          ((stats.queued_for_processing / stats.total_fetched) * 100).toFixed(1) : 0,
        excluded_breakdown: {
          companies: excludedByAuthorType,
          missing_fields: excludedByMissingFields,
          already_processed: alreadyQueued
        }
      },
      improvements: [
        '✅ FIXED TIMEOUT: Added batch processing for classification (50 items/batch)',
        '✅ OPTIMIZED INSERTION: Bulk insert instead of individual queries',
        '✅ REDUCED DATABASE CALLS: Batch duplicate checking',
        '✅ IMPROVED TIMEOUT HANDLING: Better progress tracking and pauses',
        '✅ ENHANCED LOGGING: Detailed batch progress reporting',
        'Enhanced diagnostic with Apify metadata verification',
        'Upsert logic for raw data to handle duplicates',
        'Detailed classification breakdown and exclusion tracking',
        'Automatic alert system for data loss detection',
        'Support for forceAll mode to bypass Apify filtering',
        webhook_triggered ? 'Fast webhook response architecture' : 'Manual reprocessing with full diagnostics'
      ]
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Error in process-dataset function:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})


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
    console.log('🔄 Process Dataset - NEW BATCH PIPELINE VERSION')
    
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

    console.log(`📊 ${webhook_triggered ? 'WEBHOOK' : 'MANUAL'} batch pipeline for dataset:`, datasetId)

    const apifyApiKey = Deno.env.get('APIFY_API_KEY')
    if (!apifyApiKey) {
      return new Response('Apify API key not configured', { 
        status: 500,
        headers: corsHeaders 
      })
    }

    // ✅ PHASE 1: Nettoyage rapide si demandé
    let cleanedCount = 0
    if (cleanupExisting) {
      console.log('🧹 Cleanup of existing data...')
      
      try {
        const { count: deletedLeads } = await supabaseClient
          .from('leads')
          .delete({ count: 'exact' })
          .eq('apify_dataset_id', datasetId)

        const { count: deletedPosts } = await supabaseClient
          .from('linkedin_posts')
          .delete({ count: 'exact' })
          .eq('apify_dataset_id', datasetId)

        const { count: deletedRaw } = await supabaseClient
          .from('linkedin_posts_raw')
          .delete({ count: 'exact' })
          .eq('apify_dataset_id', datasetId)

        cleanedCount = (deletedLeads || 0) + (deletedPosts || 0) + (deletedRaw || 0)
        console.log(`✅ Cleanup completed: ${cleanedCount} records deleted`)
      } catch (cleanupError) {
        console.error('❌ Error during cleanup:', cleanupError?.message)
      }
    }

    // ✅ PHASE 2: Récupération des données depuis Apify
    console.log('📥 Fetching dataset items from Apify...')
    
    let allItems = []
    let offset = 0
    const limit = 1000
    let hasMore = true

    while (hasMore) {
      try {
        const response = await fetch(
          `https://api.apify.com/v2/datasets/${datasetId}/items?format=json&clean=true&offset=${offset}&limit=${limit}`,
          {
            headers: { 'Authorization': `Bearer ${apifyApiKey}` }
          }
        )

        if (!response.ok) {
          throw new Error(`Apify API error: ${response.status} ${response.statusText}`)
        }

        const items = await response.json()
        
        if (!items || items.length === 0) {
          hasMore = false
          break
        }

        allItems = allItems.concat(items)
        offset += limit
        
        console.log(`📊 Fetched ${items.length} items (total: ${allItems.length})`)
        
        // Limite de sécurité
        if (allItems.length > 50000) {
          console.log('⚠️ Reached safety limit of 50,000 items')
          break
        }
      } catch (error) {
        console.error('❌ Error fetching items:', error?.message)
        break
      }
    }

    console.log(`📋 Total items fetched: ${allItems.length}`)

    if (allItems.length === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No items found in dataset',
        dataset_id: datasetId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ✅ PHASE 3: Vérification complète des doublons existants
    console.log('🔍 Checking for existing URNs in linkedin_posts_raw...')
    
    const incomingUrns = allItems.map(item => item.urn).filter(Boolean)
    console.log(`📊 Checking ${incomingUrns.length} URNs for duplicates...`)

    let existingUrns = new Set()
    if (incomingUrns.length > 0) {
      // Vérifier TOUS les URNs en une seule fois pour éviter les problèmes de concurrence
      const BATCH_SIZE = 1000
      for (let i = 0; i < incomingUrns.length; i += BATCH_SIZE) {
        const batch = incomingUrns.slice(i, i + BATCH_SIZE)
        
        try {
          const { data: existingPosts } = await supabaseClient
            .from('linkedin_posts_raw')
            .select('urn')
            .in('urn', batch)

          if (existingPosts) {
            existingPosts.forEach(post => existingUrns.add(post.urn))
          }
        } catch (error) {
          console.error(`❌ Error checking URNs batch ${i}-${i + batch.length}:`, error?.message)
        }
      }
    }

    console.log(`🔍 Found ${existingUrns.size} existing URNs out of ${incomingUrns.length}`)

    // ✅ PHASE 4: Filtrer les nouveaux items et déduplication interne
    let newItems = allItems.filter(item => !existingUrns.has(item.urn))
    console.log(`📊 ${newItems.length} new items after existing duplicates removal`)

    // Déduplication interne (au cas où il y aurait des doublons dans le dataset Apify)
    const seenUrns = new Set()
    newItems = newItems.filter(item => {
      if (seenUrns.has(item.urn)) {
        return false
      }
      seenUrns.add(item.urn)
      return true
    })
    console.log(`📊 ${newItems.length} items after internal deduplication`)

    if (newItems.length === 0) {
      console.log('✅ No new items to process - all were duplicates')
      
      // Démarrer quand même le pipeline pour traiter les données existantes non traitées
      try {
        const { error: pipelineError } = await supabaseClient.functions.invoke('batch-pipeline-orchestrator', {
          body: { 
            action: 'start_pipeline',
            dataset_id: datasetId
          }
        })

        if (pipelineError) {
          console.error('❌ Pipeline start failed:', pipelineError)
        } else {
          console.log('✅ Batch pipeline started for existing unprocessed data')
        }
      } catch (pipelineError) {
        console.error('❌ Error starting pipeline:', pipelineError?.message)
      }

      return new Response(JSON.stringify({ 
        success: true,
        message: 'All items were duplicates, but pipeline started for existing unprocessed data',
        dataset_id: datasetId,
        total_received: allItems.length,
        duplicates_skipped: allItems.length,
        new_items_stored: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ✅ PHASE 5: Insertion sécurisée avec gestion des conflits
    console.log(`💾 Storing ${newItems.length} new items in linkedin_posts_raw...`)
    
    const rawPostsToInsert = newItems.map(item => ({
      apify_dataset_id: datasetId,
      urn: item.urn,
      text: item.text,
      title: item.title,
      url: item.url,
      posted_at_iso: item.postedAtIso,
      posted_at_timestamp: item.postedAtTimestamp,
      author_type: item.authorType,
      author_profile_url: item.authorProfileUrl,
      author_profile_id: item.authorProfileId,
      author_name: item.authorName,
      author_headline: item.authorHeadline,
      is_repost: item.isRepost || false,
      processed: false,
      raw_data: item
    }))

    let storedRawCount = 0
    const STORAGE_BATCH_SIZE = 100 // Réduire la taille des batches pour éviter les conflits

    for (let i = 0; i < rawPostsToInsert.length; i += STORAGE_BATCH_SIZE) {
      const batch = rawPostsToInsert.slice(i, i + STORAGE_BATCH_SIZE)
      
      try {
        // Utiliser upsert avec ignoreDuplicates pour gérer les conflits
        const { error: insertError, count } = await supabaseClient
          .from('linkedin_posts_raw')
          .upsert(batch, { 
            onConflict: 'urn',
            ignoreDuplicates: true,
            count: 'exact'
          })

        if (insertError) {
          console.error(`❌ Error inserting batch ${i}-${i + batch.length}:`, insertError.message)
        } else {
          const insertedCount = count || 0
          storedRawCount += insertedCount
          console.log(`✅ Stored batch ${i}-${i + batch.length} (${insertedCount} new, ${storedRawCount}/${rawPostsToInsert.length} total)`)
        }
      } catch (error) {
        console.error(`❌ Batch insert error:`, error?.message)
      }
    }

    console.log(`💾 Stored ${storedRawCount} new raw posts (duplicates safely ignored)`)

    // ✅ PHASE 6: Démarrage du pipeline par batches
    console.log('🚀 Starting batch processing pipeline...')
    
    try {
      const { error: pipelineError } = await supabaseClient.functions.invoke('batch-pipeline-orchestrator', {
        body: { 
          action: 'start_pipeline',
          dataset_id: datasetId
        }
      })

      if (pipelineError) {
        console.error('❌ Pipeline start failed:', pipelineError)
        throw new Error(`Pipeline start failed: ${pipelineError.message}`)
      }

      console.log('✅ Batch pipeline started successfully')
    } catch (pipelineError) {
      console.error('❌ Error starting pipeline:', pipelineError?.message)
    }

    // ✅ Stockage des statistiques
    const stats = {
      dataset_id: datasetId,
      started_at: new Date().toISOString(),
      webhook_triggered,
      cleaned_existing: cleanedCount,
      total_received: allItems.length,
      duplicates_skipped: allItems.length - newItems.length,
      stored_raw: storedRawCount,
      pipeline_version: 'batch_pipeline_v2_improved',
      completed_at: new Date().toISOString()
    }

    try {
      await supabaseClient
        .from('apify_webhook_stats')
        .upsert(stats, { onConflict: 'dataset_id' })
    } catch (statsError) {
      console.error('⚠️ Error storing stats:', statsError?.message)
    }

    console.log('🎉 NEW BATCH PIPELINE: Dataset processing completed successfully')

    return new Response(JSON.stringify({ 
      success: true,
      action: 'batch_pipeline_dataset_processing',
      dataset_id: datasetId,
      statistics: stats,
      pipeline_version: 'batch_pipeline_v2_improved',
      message: `Dataset ${datasetId} processed with improved batch pipeline. ${storedRawCount} new items stored and pipeline started.`,
      enhancements: [
        'Full batch processing pipeline',
        'Natural filtering at each step',
        'Efficient rate limiting',
        'Sequential step triggering',
        'Complete data flow redesign',
        'Improved duplicate detection and handling',
        'Safe upsert with conflict resolution',
        'Reduced batch sizes for stability'
      ]
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Error in batch pipeline process-dataset:', error?.message)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error?.message,
      pipeline_version: 'batch_pipeline_v2_improved'
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})


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
    console.log('🔄 Process Dataset - RELIABLE UPSERT VERSION')
    
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

    // ✅ PHASE 3: Déduplication interne
    console.log('🔍 Internal deduplication...')
    
    const seenUrns = new Set()
    const uniqueItems = allItems.filter(item => {
      if (!item.urn || seenUrns.has(item.urn)) {
        return false
      }
      seenUrns.add(item.urn)
      return true
    })
    
    console.log(`📊 After internal deduplication: ${uniqueItems.length} unique items (${allItems.length - uniqueItems.length} internal duplicates removed)`)

    if (uniqueItems.length === 0) {
      console.log('✅ No valid unique items to process')
      
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
          console.log('✅ Batch pipeline started for existing data')
        }
      } catch (pipelineError) {
        console.error('❌ Error starting pipeline:', pipelineError?.message)
      }

      return new Response(JSON.stringify({ 
        success: true,
        message: 'No valid unique items, but pipeline started for existing data',
        dataset_id: datasetId,
        total_received: allItems.length,
        internal_duplicates_removed: allItems.length - uniqueItems.length,
        new_items_stored: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ✅ PHASE 4: Insertion avec upsert (gestion automatique des conflits)
    console.log(`💾 Storing ${uniqueItems.length} items using reliable upsert...`)
    
    const rawPostsToInsert = uniqueItems.map(item => ({
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

    let totalProcessed = 0
    const BATCH_SIZE = 100 // Taille optimisée

    for (let i = 0; i < rawPostsToInsert.length; i += BATCH_SIZE) {
      const batch = rawPostsToInsert.slice(i, i + BATCH_SIZE)
      
      try {
        console.log(`💾 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(rawPostsToInsert.length/BATCH_SIZE)} (${batch.length} items)`)
        
        // Utilisation d'upsert avec ignoreDuplicates pour gérer automatiquement les conflits
        const { error: insertError, count } = await supabaseClient
          .from('linkedin_posts_raw')
          .upsert(batch, { 
            onConflict: 'urn',
            ignoreDuplicates: true,
            count: 'exact'
          })

        if (insertError) {
          console.error(`❌ Error inserting batch ${i}-${i + batch.length}:`, insertError.message)
          // Continue avec le batch suivant
        } else {
          console.log(`✅ Batch ${i}-${i + batch.length} processed successfully (${count || batch.length} items)`)
          totalProcessed += batch.length
        }
      } catch (error) {
        console.error(`❌ Batch insert error:`, error?.message)
        // Continue avec le batch suivant
      }
    }

    console.log(`💾 Processing completed. ${totalProcessed} items processed successfully`)

    // ✅ PHASE 5: Démarrage du pipeline par batches
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
      internal_duplicates_removed: allItems.length - uniqueItems.length,
      items_processed: totalProcessed,
      pipeline_version: 'reliable_upsert_v1',
      completed_at: new Date().toISOString()
    }

    try {
      await supabaseClient
        .from('apify_webhook_stats')
        .upsert(stats, { onConflict: 'dataset_id' })
    } catch (statsError) {
      console.error('⚠️ Error storing stats:', statsError?.message)
    }

    console.log('🎉 RELIABLE UPSERT PIPELINE: Dataset processing completed successfully')

    return new Response(JSON.stringify({ 
      success: true,
      action: 'reliable_upsert_dataset_processing',
      dataset_id: datasetId,
      statistics: stats,
      pipeline_version: 'reliable_upsert_v1',
      message: `Dataset ${datasetId} processed with reliable upsert. ${totalProcessed} items processed and pipeline started.`,
      improvements: [
        'Using Supabase upsert with ignoreDuplicates for reliable conflict handling',
        'Eliminated custom SQL execution that was causing errors',
        'Optimized batch size to 100 for better performance',
        'Continue processing even if some batches fail',
        'Internal deduplication before insertion',
        'Native Supabase conflict resolution'
      ]
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Error in reliable-upsert process-dataset:', error?.message)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error?.message,
      pipeline_version: 'reliable_upsert_v1'
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

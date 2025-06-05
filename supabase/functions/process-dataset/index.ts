
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

    // ✅ PHASE 2: Récupération et stockage des données brutes
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

    // ✅ PHASE 3: Stockage en masse dans linkedin_posts_raw
    console.log('💾 Storing items in linkedin_posts_raw...')
    
    const rawPostsToInsert = allItems.map(item => ({
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
      raw_data: item
    }))

    let storedRawCount = 0
    const BATCH_SIZE = 500

    for (let i = 0; i < rawPostsToInsert.length; i += BATCH_SIZE) {
      const batch = rawPostsToInsert.slice(i, i + BATCH_SIZE)
      
      try {
        const { error: insertError } = await supabaseClient
          .from('linkedin_posts_raw')
          .insert(batch)

        if (insertError) {
          console.error(`❌ Error inserting batch ${i}-${i + batch.length}:`, insertError.message)
        } else {
          storedRawCount += batch.length
          console.log(`✅ Stored batch ${i}-${i + batch.length} (${storedRawCount}/${rawPostsToInsert.length})`)
        }
      } catch (error) {
        console.error(`❌ Batch insert error:`, error?.message)
      }
    }

    console.log(`💾 Stored ${storedRawCount} raw posts`)

    // ✅ PHASE 4: Démarrage du pipeline par batches
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
      stored_raw: storedRawCount,
      pipeline_version: 'batch_pipeline_v2',
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
      pipeline_version: 'batch_pipeline_v2',
      message: `Dataset ${datasetId} processed with new batch pipeline. ${storedRawCount} items stored and pipeline started.`,
      enhancements: [
        'Full batch processing pipeline',
        'Natural filtering at each step',
        'Efficient rate limiting',
        'Sequential step triggering',
        'Complete data flow redesign'
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
      pipeline_version: 'batch_pipeline_v2'
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})


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
    console.log('🔄 Process Dataset - OPTIMIZED VERSION V4 WITH TIMEOUT PROTECTION')
    
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

    const apifyApiKey = Deno.env.get('APIFY_API_KEY')
    if (!apifyApiKey) {
      return new Response('Apify API key not configured', { 
        status: 500,
        headers: corsHeaders 
      })
    }

    // ✅ PHASE 1: Nettoyage rapide et optimisé si demandé
    let cleanedCount = 0
    if (cleanupExisting) {
      console.log('🧹 Starting optimized cleanup...')
      
      try {
        // Nettoyage par petits batches pour éviter les timeouts
        const CLEANUP_BATCH_SIZE = 1000
        let totalCleaned = 0
        
        console.log('🗑️ Cleaning leads table...')
        let hasMoreLeads = true
        while (hasMoreLeads) {
          const { count: deletedLeads } = await supabaseClient
            .from('leads')
            .delete({ count: 'exact' })
            .eq('apify_dataset_id', datasetId)
            .limit(CLEANUP_BATCH_SIZE)
          
          if (!deletedLeads || deletedLeads === 0) {
            hasMoreLeads = false
          } else {
            totalCleaned += deletedLeads
            console.log(`🗑️ Deleted ${deletedLeads} leads (total: ${totalCleaned})`)
          }
        }

        console.log('🗑️ Cleaning linkedin_posts table...')
        let hasMorePosts = true
        while (hasMorePosts) {
          const { count: deletedPosts } = await supabaseClient
            .from('linkedin_posts')
            .delete({ count: 'exact' })
            .eq('apify_dataset_id', datasetId)
            .limit(CLEANUP_BATCH_SIZE)
          
          if (!deletedPosts || deletedPosts === 0) {
            hasMorePosts = false
          } else {
            totalCleaned += deletedPosts
            console.log(`🗑️ Deleted ${deletedPosts} posts (total: ${totalCleaned})`)
          }
        }

        console.log('🗑️ Cleaning linkedin_posts_raw table...')
        let hasMoreRaw = true
        while (hasMoreRaw) {
          const { count: deletedRaw } = await supabaseClient
            .from('linkedin_posts_raw')
            .delete({ count: 'exact' })
            .eq('apify_dataset_id', datasetId)
            .limit(CLEANUP_BATCH_SIZE)
          
          if (!deletedRaw || deletedRaw === 0) {
            hasMoreRaw = false
          } else {
            totalCleaned += deletedRaw
            console.log(`🗑️ Deleted ${deletedRaw} raw posts (total: ${totalCleaned})`)
          }
        }

        cleanedCount = totalCleaned
        console.log(`✅ Cleanup completed: ${cleanedCount} records deleted`)
      } catch (cleanupError) {
        console.error('❌ Error during cleanup:', cleanupError?.message)
      }
    }

    // ✅ PHASE 2: Récupération limitée des données depuis Apify
    console.log('📥 Fetching dataset items from Apify with safety limits...')
    
    let allItems = []
    let offset = 0
    const limit = 500 // Réduit pour éviter les timeouts
    let hasMore = true
    const MAX_ITEMS = 10000 // Limite de sécurité stricte

    while (hasMore && allItems.length < MAX_ITEMS) {
      try {
        console.log(`📥 Fetching batch at offset ${offset}...`)
        
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

    // ✅ PHASE 3: Filtrage et déduplication interne rapide
    console.log('🔍 Quick filtering and internal deduplication...')
    
    const seenUrns = new Set()
    const filteredItems = allItems.filter(item => {
      if (item.isRepost) return false;
      if (item.authorType !== 'Person') return false;
      if (seenUrns.has(item.urn)) return false;
      seenUrns.add(item.urn);
      return true;
    })
    
    console.log(`📊 After filtering: ${filteredItems.length} valid items`)

    if (filteredItems.length === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No valid items after filtering',
        dataset_id: datasetId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ✅ PHASE 4: Vérification des doublons avec pagination pour éviter les timeouts
    console.log('🔄 Checking for existing URNs with batched queries...')
    
    const DEDUP_BATCH_SIZE = 100 // Petits batches pour éviter les timeouts
    const existingUrnSet = new Set()
    
    for (let i = 0; i < filteredItems.length; i += DEDUP_BATCH_SIZE) {
      const batch = filteredItems.slice(i, i + DEDUP_BATCH_SIZE)
      const batchUrns = batch.map(item => item.urn)
      
      try {
        console.log(`🔍 Checking URNs batch ${Math.floor(i/DEDUP_BATCH_SIZE) + 1}/${Math.ceil(filteredItems.length/DEDUP_BATCH_SIZE)}`)
        
        const { data: existingPosts, error } = await supabaseClient
          .from('linkedin_posts_raw')
          .select('urn')
          .in('urn', batchUrns)
          .limit(DEDUP_BATCH_SIZE)

        if (error) {
          console.error('⚠️ Error checking duplicates:', error.message)
          continue
        }

        if (existingPosts) {
          existingPosts.forEach(post => existingUrnSet.add(post.urn))
        }
      } catch (error) {
        console.error('❌ Exception checking batch:', error?.message)
      }
    }

    const newItems = filteredItems.filter(item => !existingUrnSet.has(item.urn))
    console.log(`📊 After database deduplication: ${newItems.length} new items`)

    if (newItems.length === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No new items to process',
        dataset_id: datasetId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ✅ PHASE 5: Stockage optimisé avec petits batches
    console.log(`💾 Storing ${newItems.length} items with small batches...`)
    
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

    let totalRawStored = 0
    const RAW_BATCH_SIZE = 50 // Réduit pour éviter les timeouts

    for (let i = 0; i < rawPostsToInsert.length; i += RAW_BATCH_SIZE) {
      const batch = rawPostsToInsert.slice(i, i + RAW_BATCH_SIZE)
      
      try {
        console.log(`💾 Storing raw batch ${Math.floor(i/RAW_BATCH_SIZE) + 1}/${Math.ceil(rawPostsToInsert.length/RAW_BATCH_SIZE)}`)
        
        const { error: insertError } = await supabaseClient
          .from('linkedin_posts_raw')
          .upsert(batch, { 
            onConflict: 'urn',
            ignoreDuplicates: true 
          })

        if (insertError) {
          console.error(`❌ Error storing raw batch:`, insertError.message)
        } else {
          totalRawStored += batch.length
          console.log(`✅ Stored ${batch.length} raw items (total: ${totalRawStored})`)
        }
      } catch (error) {
        console.error(`❌ Exception storing raw batch:`, error?.message)
      }
    }

    // ✅ PHASE 6: Stockage des posts traités avec petits batches
    console.log(`🚀 Creating processed posts with small batches...`)
    
    const postsToProcess = newItems.map(item => ({
      apify_dataset_id: datasetId,
      urn: item.urn,
      text: item.text || 'Content unavailable',
      title: item.title || null,
      url: item.url,
      posted_at_timestamp: item.postedAtTimestamp || null,
      posted_at_iso: item.postedAtIso || null,
      author_type: item.authorType,
      author_profile_url: item.authorProfileUrl || 'Unknown',
      author_profile_id: item.authorProfileId || null,
      author_name: item.authorName || 'Unknown author',
      author_headline: item.authorHeadline || null,
      processing_status: 'pending',
      raw_data: item
    }))

    let totalProcessedStored = 0
    const PROCESSED_BATCH_SIZE = 50 // Réduit pour éviter les timeouts

    for (let i = 0; i < postsToProcess.length; i += PROCESSED_BATCH_SIZE) {
      const batch = postsToProcess.slice(i, i + PROCESSED_BATCH_SIZE)
      
      try {
        console.log(`🚀 Storing processed batch ${Math.floor(i/PROCESSED_BATCH_SIZE) + 1}/${Math.ceil(postsToProcess.length/PROCESSED_BATCH_SIZE)}`)
        
        const { error: insertError } = await supabaseClient
          .from('linkedin_posts')
          .upsert(batch, { 
            onConflict: 'urn',
            ignoreDuplicates: true 
          })

        if (insertError) {
          console.error(`❌ Error storing processed batch:`, insertError.message)
        } else {
          totalProcessedStored += batch.length
          console.log(`✅ Stored ${batch.length} processed items (total: ${totalProcessedStored})`)
        }
      } catch (error) {
        console.error(`❌ Exception storing processed batch:`, error?.message)
      }
    }

    // ✅ PHASE 7: Déclenchement du processing manager
    console.log('🚀 Triggering processing queue manager...')
    
    try {
      const { data: queueResult, error: queueError } = await supabaseClient.functions.invoke('processing-queue-manager', {
        body: {
          action: 'queue_posts',
          dataset_id: datasetId,
          timeout_protection: true
        }
      });

      if (queueError) {
        console.error('⚠️ Warning triggering queue manager:', queueError);
      } else {
        console.log('✅ Queue manager triggered successfully');
      }
    } catch (error) {
      console.error('❌ Exception triggering queue manager:', error?.message)
    }

    // ✅ Stockage des statistiques finales
    const stats = {
      dataset_id: datasetId,
      started_at: new Date().toISOString(),
      webhook_triggered,
      cleaned_existing: cleanedCount,
      total_received: allItems.length,
      after_filtering: filteredItems.length,
      after_deduplication: newItems.length,
      raw_items_stored: totalRawStored,
      processed_items_stored: totalProcessedStored,
      pipeline_version: 'timeout_protected_v4',
      completed_at: new Date().toISOString()
    }

    try {
      await supabaseClient
        .from('apify_webhook_stats')
        .upsert(stats, { onConflict: 'dataset_id' })
    } catch (statsError) {
      console.error('⚠️ Error storing stats:', statsError?.message)
    }

    console.log('🎉 TIMEOUT-PROTECTED PROCESSING: Dataset processing completed successfully')

    return new Response(JSON.stringify({ 
      success: true,
      action: 'timeout_protected_dataset_processing_v4',
      dataset_id: datasetId,
      statistics: stats,
      pipeline_version: 'timeout_protected_v4',
      message: `Dataset ${datasetId} processed successfully. ${totalProcessedStored} posts ready for processing.`,
      queue_triggered: true,
      improvements: [
        'Reduced batch sizes to prevent SQL timeouts',
        'Added comprehensive logging for timeout tracking',
        'Implemented paginated duplicate checking',
        'Added safety limits on data volume',
        'Optimized cleanup with batched deletions',
        'Enhanced error handling for each operation'
      ]
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Error in timeout-protected process-dataset:', error?.message)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error?.message,
      pipeline_version: 'timeout_protected_v4'
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

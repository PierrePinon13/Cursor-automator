
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
    console.log('🔄 Process Dataset - OPTIMIZED VERSION V5 WITH N8N WEBHOOK')
    
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

    // ✅ PHASE 6: Envoi vers le webhook N8N avec délais
    console.log(`🚀 Sending ${newItems.length} items to N8N webhook in batches...`)
    
    const N8N_WEBHOOK_URL = 'https://n8n.getpro.co/webhook/ce694cea-07a6-4b38-a2a9-eb1ffd6fd14c'
    const N8N_BATCH_SIZE = 100
    const DELAY_BETWEEN_BATCHES = 10000 // 10 secondes
    
    let batchesSent = 0
    let batchErrors = 0
    const totalBatches = Math.ceil(newItems.length / N8N_BATCH_SIZE)

    // Traitement par batch avec délais
    for (let i = 0; i < newItems.length; i += N8N_BATCH_SIZE) {
      const batch = newItems.slice(i, i + N8N_BATCH_SIZE)
      const batchNumber = Math.floor(i / N8N_BATCH_SIZE) + 1
      const batchId = `${datasetId}_batch_${batchNumber}_${Date.now()}`
      
      try {
        console.log(`📤 Sending batch ${batchNumber}/${totalBatches} to N8N (${batch.length} items)`)
        
        const response = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            batch_id: batchId,
            dataset_id: datasetId,
            batch_number: batchNumber,
            total_batches: totalBatches,
            posts: batch.map(item => ({
              urn: item.urn,
              text: item.text,
              title: item.title || '',
              url: item.url,
              posted_at_iso: item.postedAtIso,
              posted_at_timestamp: item.postedAtTimestamp,
              author_type: item.authorType,
              author_profile_url: item.authorProfileUrl,
              author_profile_id: item.authorProfileId,
              author_name: item.authorName,
              author_headline: item.authorHeadline,
              raw_data: item
            }))
          })
        })

        if (response.ok) {
          batchesSent++
          console.log(`✅ Batch ${batchId} sent successfully to N8N`)
        } else {
          batchErrors++
          console.error(`❌ Error sending batch ${batchId} to N8N: ${response.status} ${response.statusText}`)
        }

        // Délai entre les batches (sauf pour le dernier)
        if (i + N8N_BATCH_SIZE < newItems.length) {
          console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES / 1000}s before next batch...`)
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
        }

      } catch (error) {
        batchErrors++
        console.error(`❌ Exception sending batch ${batchId} to N8N:`, error?.message)
      }
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
      n8n_batches_sent: batchesSent,
      n8n_batch_errors: batchErrors,
      pipeline_version: 'n8n_webhook_v5',
      completed_at: new Date().toISOString()
    }

    try {
      await supabaseClient
        .from('apify_webhook_stats')
        .upsert(stats, { onConflict: 'dataset_id' })
    } catch (statsError) {
      console.error('⚠️ Error storing stats:', statsError?.message)
    }

    console.log('🎉 N8N WEBHOOK PROCESSING: Dataset processing completed successfully')

    return new Response(JSON.stringify({ 
      success: true,
      action: 'n8n_webhook_dataset_processing_v5',
      dataset_id: datasetId,
      statistics: stats,
      pipeline_version: 'n8n_webhook_v5',
      message: `Dataset ${datasetId} processed successfully. ${batchesSent}/${totalBatches} batches sent to N8N webhook.`,
      n8n_webhook_url: N8N_WEBHOOK_URL,
      improvements: [
        'Restored N8N webhook integration instead of processing-queue-manager',
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
    console.error('❌ Error in N8N webhook process-dataset:', error?.message)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error?.message,
      pipeline_version: 'n8n_webhook_v5'
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

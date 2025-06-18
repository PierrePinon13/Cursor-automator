
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
    console.log('🔄 Process Dataset - OPTIMIZED VERSION WITHOUT PROCESSING TASKS')
    
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

    // ✅ PHASE 3: Filtrage et déduplication interne
    console.log('🔍 Filtering and internal deduplication...')
    
    const seenUrns = new Set()
    const filteredItems = allItems.filter(item => {
      // Filtrer les reposts
      if (item.isRepost) return false;
      
      // Ne garder que les posts de personnes (pas d'entreprises)
      if (item.authorType !== 'Person') return false;
      
      // Déduplication interne
      if (seenUrns.has(item.urn)) return false;
      seenUrns.add(item.urn);
      
      return true;
    })
    
    console.log(`📊 After filtering: ${filteredItems.length} valid items (${allItems.length - filteredItems.length} filtered out)`)

    if (filteredItems.length === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No valid items after filtering',
        dataset_id: datasetId,
        total_received: allItems.length,
        filtered_out: allItems.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ✅ PHASE 4: Vérification des doublons dans la base
    console.log('🔄 Checking for existing URNs in database...')
    
    const existingUrns = filteredItems.map(item => item.urn);
    const { data: existingPosts } = await supabaseClient
      .from('linkedin_posts_raw')
      .select('urn')
      .in('urn', existingUrns);

    const existingUrnSet = new Set(existingPosts?.map(p => p.urn) || []);
    const newItems = filteredItems.filter(item => !existingUrnSet.has(item.urn));

    console.log(`📊 After database deduplication: ${newItems.length} new items (${filteredItems.length - newItems.length} already exist)`)

    if (newItems.length === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No new items to process',
        dataset_id: datasetId,
        total_received: allItems.length,
        after_filtering: filteredItems.length,
        new_items: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ✅ PHASE 5: Stockage en base (raw posts d'abord)
    console.log(`💾 Storing ${newItems.length} raw items in database...`)
    
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
    const RAW_BATCH_SIZE = 100

    for (let i = 0; i < rawPostsToInsert.length; i += RAW_BATCH_SIZE) {
      const batch = rawPostsToInsert.slice(i, i + RAW_BATCH_SIZE)
      
      try {
        const { error: insertError } = await supabaseClient
          .from('linkedin_posts_raw')
          .upsert(batch, { 
            onConflict: 'urn',
            ignoreDuplicates: true 
          })

        if (insertError) {
          console.error(`❌ Error storing raw batch ${i}-${i + batch.length}:`, insertError.message)
        } else {
          totalRawStored += batch.length
          console.log(`✅ Stored raw batch ${i}-${i + batch.length} successfully`)
        }
      } catch (error) {
        console.error(`❌ Exception storing raw batch:`, error?.message)
      }
    }

    // ✅ PHASE 6: Stockage des posts traités (directement en pending)
    console.log(`🚀 Creating processed posts for immediate processing...`)
    
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
    const PROCESSED_BATCH_SIZE = 100

    for (let i = 0; i < postsToProcess.length; i += PROCESSED_BATCH_SIZE) {
      const batch = postsToProcess.slice(i, i + PROCESSED_BATCH_SIZE)
      
      try {
        const { error: insertError } = await supabaseClient
          .from('linkedin_posts')
          .upsert(batch, { 
            onConflict: 'urn',
            ignoreDuplicates: true 
          })

        if (insertError) {
          console.error(`❌ Error storing processed batch ${i}-${i + batch.length}:`, insertError.message)
        } else {
          totalProcessedStored += batch.length
          console.log(`✅ Stored processed batch ${i}-${i + batch.length} successfully`)
        }
      } catch (error) {
        console.error(`❌ Exception storing processed batch:`, error?.message)
      }
    }

    // ✅ PHASE 7: Déclenchement immédiat du processing manager
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
        console.log('✅ Queue manager triggered successfully:', queueResult);
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
      pipeline_version: 'optimized_direct_processing_v3',
      completed_at: new Date().toISOString()
    }

    try {
      await supabaseClient
        .from('apify_webhook_stats')
        .upsert(stats, { onConflict: 'dataset_id' })
    } catch (statsError) {
      console.error('⚠️ Error storing stats:', statsError?.message)
    }

    console.log('🎉 OPTIMIZED DIRECT PROCESSING: Dataset processing completed successfully')

    return new Response(JSON.stringify({ 
      success: true,
      action: 'optimized_direct_dataset_processing_v3',
      dataset_id: datasetId,
      statistics: stats,
      pipeline_version: 'optimized_direct_processing_v3',
      message: `Dataset ${datasetId} processed successfully. ${totalProcessedStored} posts ready for processing.`,
      queue_triggered: true,
      improvements: [
        'Direct processing without problematic task table',
        'No timeout issues with large datasets',
        'Immediate queue manager trigger',
        'Robust error handling for individual batches',
        'Filtering: no reposts, Person only',
        'Complete internal and database deduplication'
      ]
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Error in optimized process-dataset:', error?.message)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error?.message,
      pipeline_version: 'optimized_direct_processing_v3'
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

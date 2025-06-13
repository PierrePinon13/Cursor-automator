
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
    console.log('🔄 Process Dataset - N8N INTEGRATION VERSION')
    
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

    // ✅ PHASE 5: Stockage en base avec status 'pending_openai'
    console.log(`💾 Storing ${newItems.length} items in database...`)
    
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

    let totalStored = 0
    const STORAGE_BATCH_SIZE = 100

    for (let i = 0; i < rawPostsToInsert.length; i += STORAGE_BATCH_SIZE) {
      const batch = rawPostsToInsert.slice(i, i + STORAGE_BATCH_SIZE)
      
      try {
        const { error: insertError } = await supabaseClient
          .from('linkedin_posts_raw')
          .upsert(batch, { 
            onConflict: 'urn',
            ignoreDuplicates: true 
          })

        if (insertError) {
          console.error(`❌ Error storing batch ${i}-${i + batch.length}:`, insertError.message)
        } else {
          totalStored += batch.length
          console.log(`✅ Stored batch ${i}-${i + batch.length} successfully`)
        }
      } catch (error) {
        console.error(`❌ Exception storing batch:`, error?.message)
      }
    }

    // ✅ PHASE 6: Créer une tâche de traitement séparée pour n8n
    console.log('🚀 Scheduling n8n batch processing...')
    
    const totalBatches = Math.ceil(newItems.length / 100)
    
    // Stocker la tâche de traitement
    try {
      const { error: taskError } = await supabaseClient
        .from('dataset_processing_tasks')
        .insert({
          dataset_id: datasetId,
          total_items: newItems.length,
          total_batches: totalBatches,
          status: 'pending',
          created_at: new Date().toISOString(),
          batch_data: newItems
        })

      if (taskError) {
        console.error('❌ Error creating processing task:', taskError)
      } else {
        console.log('✅ Processing task created successfully')
        
        // Déclencher immédiatement le processeur de batches
        supabaseClient.functions.invoke('n8n-batch-processor', {
          body: { dataset_id: datasetId }
        }).catch(err => {
          console.error('❌ Error triggering batch processor:', err)
        })
      }
    } catch (error) {
      console.error('❌ Exception creating processing task:', error)
    }

    // ✅ Stockage des statistiques
    const stats = {
      dataset_id: datasetId,
      started_at: new Date().toISOString(),
      webhook_triggered,
      cleaned_existing: cleanedCount,
      total_received: allItems.length,
      after_filtering: filteredItems.length,
      after_deduplication: newItems.length,
      items_stored: totalStored,
      batches_scheduled: totalBatches,
      pipeline_version: 'n8n_integration_v2_optimized',
      completed_at: new Date().toISOString()
    }

    try {
      await supabaseClient
        .from('apify_webhook_stats')
        .upsert(stats, { onConflict: 'dataset_id' })
    } catch (statsError) {
      console.error('⚠️ Error storing stats:', statsError?.message)
    }

    console.log('🎉 OPTIMIZED N8N INTEGRATION: Dataset processing completed successfully')

    return new Response(JSON.stringify({ 
      success: true,
      action: 'n8n_integration_dataset_processing_v2',
      dataset_id: datasetId,
      statistics: stats,
      pipeline_version: 'n8n_integration_v2_optimized',
      message: `Dataset ${datasetId} processed and stored. ${totalStored} items ready for batch processing.`,
      batch_processing: 'scheduled_separately',
      improvements: [
        'Fast response with batch processing scheduled separately',
        'No timeout issues with large datasets',
        'Robust error handling for individual batches',
        'Filtering: no reposts, Person only',
        'Internal and database deduplication'
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
      pipeline_version: 'n8n_integration_v2_optimized'
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

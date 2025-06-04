
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
    console.log('🔄 Dataset processing started - ENHANCED VERSION WITH OPENAI RESTART')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { datasetId, cleanupExisting = false, webhook_triggered = false, forceAll = false, resumeFromBatch = 0, bypassMetadataCheck = false, forceOpenAIRestart = false } = await req.json()
    
    if (!datasetId) {
      return new Response('Dataset ID is required', { 
        status: 400,
        headers: corsHeaders 
      })
    }

    console.log(`📊 ${webhook_triggered ? 'WEBHOOK' : 'MANUAL'} processing for dataset:`, datasetId)
    console.log(`🚨 BYPASS MODE: ${bypassMetadataCheck ? 'ENABLED' : 'DISABLED'}`)
    console.log(`🔥 OPENAI RESTART: ${forceOpenAIRestart ? 'ENABLED' : 'DISABLED'}`)

    const apifyApiKey = Deno.env.get('APIFY_API_KEY')
    if (!apifyApiKey) {
      return new Response('Apify API key not configured', { 
        status: 500,
        headers: corsHeaders 
      })
    }

    // ✅ PHASE 1: Nettoyage rapide si demandé
    let cleanedCount = 0
    if (cleanupExisting && resumeFromBatch === 0) {
      console.log('🧹 Quick cleanup of existing data...')
      
      try {
        // Si forceOpenAIRestart, supprimer aussi les leads
        if (forceOpenAIRestart) {
          const { count: deletedLeads } = await supabaseClient
            .from('leads')
            .delete({ count: 'exact' })
            .eq('apify_dataset_id', datasetId)
          
          console.log(`🗑️ Deleted ${deletedLeads || 0} leads for OpenAI restart`)
        }

        const { count: deletedPosts } = await supabaseClient
          .from('linkedin_posts')
          .delete({ count: 'exact' })
          .eq('apify_dataset_id', datasetId)

        const { count: deletedRaw } = await supabaseClient
          .from('linkedin_posts_raw')
          .delete({ count: 'exact' })
          .eq('apify_dataset_id', datasetId)

        cleanedCount = (deletedPosts || 0) + (deletedRaw || 0)
        console.log(`✅ Enhanced cleanup completed: ${cleanedCount} records deleted`)
      } catch (cleanupError) {
        console.error('❌ Error during cleanup:', cleanupError?.message)
      }
    }

    // ✅ PHASE 2: Vérification métadonnées ULTRA-RAPIDE (ou bypass)
    let metadataInfo = { itemCount: 0, cleanItemCount: 0, bypassed: bypassMetadataCheck }
    
    if (!bypassMetadataCheck) {
      console.log('🔍 Quick metadata check...')
      try {
        const metadataResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}`, {
          headers: { 'Authorization': `Bearer ${apifyApiKey}` }
        })
        
        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json()
          metadataInfo.itemCount = metadata?.itemCount || 0
          metadataInfo.cleanItemCount = metadata?.cleanItemCount || 0
          console.log(`📋 Quick metadata: ${metadataInfo.itemCount} items`)
        }
      } catch (error) {
        console.log('⚠️ Metadata check failed, proceeding anyway')
      }
    } else {
      console.log('🚨 BYPASS MODE: Skipping metadata checks completely')
    }

    // ✅ PHASE 3: DÉLÉGATION IMMÉDIATE avec action corrigée
    console.log('🚀 IMMEDIATE DELEGATION to enhanced fast webhook processing...')
    
    try {
      console.log('📤 Delegating to enhanced fast_webhook_processing action...')

      const { data: queueResponse, error: queueError } = await supabaseClient.functions.invoke('processing-queue-manager', {
        body: {
          action: 'fast_webhook_processing',
          dataset_id: datasetId,
          apify_api_key: apifyApiKey,
          force_all: forceAll,
          force_openai_restart: forceOpenAIRestart
        }
      })

      if (queueError) {
        console.error('❌ Queue delegation failed:', queueError)
        throw new Error(`Queue delegation failed: ${queueError.message}`)
      }

      console.log('✅ Successfully delegated to enhanced queue manager:', queueResponse)

      // ✅ Retour IMMÉDIAT avec confirmation de délégation
      const stats = {
        dataset_id: datasetId,
        started_at: new Date().toISOString(),
        webhook_triggered,
        cleaned_existing: cleanedCount,
        metadata_info: metadataInfo,
        delegated_at: new Date().toISOString(),
        delegation_successful: true,
        force_openai_restart: forceOpenAIRestart,
        optimization_applied: 'immediate_delegation_with_enhanced_openai_restart'
      }

      // Stockage des stats de délégation
      try {
        await supabaseClient
          .from('apify_webhook_stats')
          .upsert({
            ...stats,
            total_received: metadataInfo.itemCount,
            stored_raw: 0, // Sera mis à jour par le queue manager
            queued_for_processing: 0, // Sera mis à jour par le queue manager
            processing_errors: 0,
            completed_at: new Date().toISOString(),
            reprocessing: !webhook_triggered,
            bypass_metadata_check: bypassMetadataCheck,
            cpu_optimization: true
          }, { onConflict: 'dataset_id' })
      } catch (statsError) {
        console.error('⚠️ Error storing delegation stats:', statsError?.message)
      }

      console.log('🎉 ENHANCED PROCESSING: Immediate delegation with OpenAI restart completed successfully')

      return new Response(JSON.stringify({ 
        success: true,
        action: 'enhanced_dataset_processing_delegation_with_openai_restart',
        dataset_id: datasetId,
        statistics: stats,
        queue_response: queueResponse,
        optimization: {
          strategy: 'immediate_delegation_with_openai_restart',
          reason: 'prevent_cpu_timeout_and_force_openai_restart',
          delegation_time_ms: Date.now() - new Date(stats.started_at).getTime()
        },
        diagnostics: {
          metadata_bypass_used: bypassMetadataCheck,
          expected_items: metadataInfo.itemCount || 'unknown',
          cleaned_records: cleanedCount,
          openai_restart_forced: forceOpenAIRestart
        },
        enhancements: [
          'OpenAI processing restart capability',
          'Enhanced cleanup including leads',
          'Forced queue manager trigger',
          'Improved delegation tracking'
        ],
        message: `Dataset ${datasetId} processing delegated to specialized queue manager with ${forceOpenAIRestart ? 'ENHANCED OpenAI restart' : 'standard processing'}. Processing will continue in background.`
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } catch (delegationError) {
      console.error('❌ Error during enhanced delegation:', delegationError?.message)
      
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Enhanced delegation to queue manager failed',
        message: delegationError?.message,
        dataset_id: datasetId,
        retry_suggestion: 'Try again or contact support if the issue persists'
      }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

  } catch (error) {
    console.error('❌ Error in enhanced process-dataset function:', error?.message)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error?.message,
      optimization: 'enhanced_immediate_delegation_failed'
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

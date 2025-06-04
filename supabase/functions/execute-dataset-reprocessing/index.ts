
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
    console.log('🚀 Starting ENHANCED automatic dataset reprocessing for xgdQ1dvEqt6bpn0mV');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const datasetId = 'xgdQ1dvEqt6bpn0mV';

    // Étape 1: Nettoyage complet ET remise à zéro des statuts OpenAI
    console.log('🧹 Step 1: ENHANCED cleanup - removing data AND resetting OpenAI status...');
    
    // Supprimer les leads associés à ce dataset
    const { count: deletedLeads } = await supabaseClient
      .from('leads')
      .delete({ count: 'exact' })
      .eq('apify_dataset_id', datasetId);

    // Supprimer les posts traités
    const { count: deletedPosts } = await supabaseClient
      .from('linkedin_posts')
      .delete({ count: 'exact' })
      .eq('apify_dataset_id', datasetId);

    // Supprimer les posts raw
    const { count: deletedRaw } = await supabaseClient
      .from('linkedin_posts_raw')
      .delete({ count: 'exact' })
      .eq('apify_dataset_id', datasetId);

    console.log(`✅ ENHANCED cleanup completed: ${(deletedPosts || 0)} processed posts + ${(deletedRaw || 0)} raw posts + ${(deletedLeads || 0)} leads deleted`);

    // Étape 2: Déclencher le retraitement complet avec forçage OpenAI
    console.log('🔄 Step 2: Triggering FULL reprocessing with OpenAI reset...');
    
    const { data: reprocessingResult, error: reprocessingError } = await supabaseClient.functions.invoke('process-dataset', {
      body: {
        datasetId: datasetId,
        cleanupExisting: false, // Déjà fait à l'étape 1
        forceAll: false,
        bypassMetadataCheck: true, // Force bypass pour éviter les problèmes de métadonnées
        forceOpenAIRestart: true // Nouveau paramètre pour forcer le restart OpenAI
      }
    });

    if (reprocessingError) {
      console.error('❌ Error during enhanced reprocessing:', reprocessingError);
      throw new Error(`Enhanced reprocessing failed: ${reprocessingError.message}`);
    }

    console.log('✅ Enhanced reprocessing delegated successfully:', reprocessingResult);

    // Étape 3: Attendre un peu puis forcer le démarrage du Step 1 OpenAI
    console.log('⏳ Step 3: Forcing OpenAI Step 1 processing startup...');
    
    // Attendre 10 secondes pour que l'ingestion commence
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Forcer le démarrage du Step 1 OpenAI
    const { data: queueResult, error: queueError } = await supabaseClient.functions.invoke('processing-queue-manager', {
      body: {
        action: 'queue_posts',
        timeout_protection: true,
        force_restart: true
      }
    });

    if (queueError) {
      console.error('⚠️ Warning during OpenAI queue startup:', queueError);
    } else {
      console.log('✅ OpenAI Step 1 queue started:', queueResult);
    }

    // Étape 4: Vérification finale
    console.log('📊 Step 4: Final verification...');
    
    const { count: rawCount } = await supabaseClient
      .from('linkedin_posts_raw')
      .select('*', { count: 'exact', head: true })
      .eq('apify_dataset_id', datasetId);

    const { count: processedCount } = await supabaseClient
      .from('linkedin_posts')
      .select('*', { count: 'exact', head: true })
      .eq('apify_dataset_id', datasetId);

    const { count: pendingCount } = await supabaseClient
      .from('linkedin_posts')
      .select('*', { count: 'exact', head: true })
      .eq('apify_dataset_id', datasetId)
      .eq('processing_status', 'pending');

    console.log(`📈 ENHANCED Final counts for dataset ${datasetId}:`);
    console.log(`   📥 Raw posts: ${rawCount || 0}`);
    console.log(`   🎯 Queued for processing: ${processedCount || 0}`);
    console.log(`   ⏳ Currently pending OpenAI: ${pendingCount || 0}`);

    const response = {
      success: true,
      action: 'enhanced_dataset_reprocessed_with_openai_restart',
      dataset_id: datasetId,
      cleanup: {
        deleted_posts: deletedPosts || 0,
        deleted_raw: deletedRaw || 0,
        deleted_leads: deletedLeads || 0
      },
      reprocessing_result: reprocessingResult,
      queue_startup: queueResult,
      verification: {
        raw_posts: rawCount || 0,
        queued_posts: processedCount || 0,
        pending_openai: pendingCount || 0
      },
      enhancements: [
        'Complete data cleanup including leads',
        'Forced OpenAI processing restart',
        'Automatic queue manager trigger',
        'Enhanced verification with OpenAI status'
      ],
      architecture: 'enhanced_reprocessing_with_openai_restart',
      message: `Dataset ${datasetId} successfully reprocessed with ENHANCED cleanup and OpenAI restart: ${processedCount || 0} posts queued, ${pendingCount || 0} pending OpenAI processing`
    };

    console.log('🎉 ENHANCED automatic reprocessing completed successfully with OpenAI restart');
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in enhanced execute-dataset-reprocessing:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Unknown error during enhanced reprocessing with OpenAI restart'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

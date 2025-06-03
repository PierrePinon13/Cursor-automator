
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
    console.log('🚀 Starting automatic dataset reprocessing for xgdQ1dvEqt6bpn0mV');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const datasetId = 'xgdQ1dvEqt6bpn0mV';

    // Étape 1: Nettoyage complet des données existantes
    console.log('🧹 Step 1: Cleaning existing data for dataset:', datasetId);
    
    const { count: deletedPosts } = await supabaseClient
      .from('linkedin_posts')
      .delete({ count: 'exact' })
      .eq('apify_dataset_id', datasetId);

    const { count: deletedRaw } = await supabaseClient
      .from('linkedin_posts_raw')
      .delete({ count: 'exact' })
      .eq('apify_dataset_id', datasetId);

    console.log(`✅ Cleanup completed: ${(deletedPosts || 0)} processed posts + ${(deletedRaw || 0)} raw posts deleted`);

    // Étape 2: Déclencher le retraitement via process-dataset avec la nouvelle architecture
    console.log('🔄 Step 2: Triggering optimized dataset processing...');
    
    const { data: reprocessingResult, error: reprocessingError } = await supabaseClient.functions.invoke('process-dataset', {
      body: {
        datasetId: datasetId,
        cleanupExisting: false, // Déjà fait à l'étape 1
        forceAll: false
      }
    });

    if (reprocessingError) {
      console.error('❌ Error during reprocessing:', reprocessingError);
      throw new Error(`Reprocessing failed: ${reprocessingError.message}`);
    }

    console.log('✅ Optimized reprocessing completed successfully:', reprocessingResult);

    // Étape 3: Vérification des résultats
    console.log('📊 Step 3: Verifying results...');
    
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

    console.log(`📈 Final counts for dataset ${datasetId}:`);
    console.log(`   📥 Raw posts: ${rawCount || 0}`);
    console.log(`   🎯 Queued for processing: ${processedCount || 0}`);
    console.log(`   ⏳ Currently pending: ${pendingCount || 0}`);

    const response = {
      success: true,
      action: 'dataset_reprocessed_optimized',
      dataset_id: datasetId,
      cleanup: {
        deleted_posts: deletedPosts || 0,
        deleted_raw: deletedRaw || 0
      },
      reprocessing_result: reprocessingResult,
      verification: {
        raw_posts: rawCount || 0,
        queued_posts: processedCount || 0,
        pending_posts: pendingCount || 0
      },
      architecture: 'optimized_fast_ingestion_with_specialized_processing',
      message: `Dataset ${datasetId} successfully reprocessed with optimized architecture: ${processedCount || 0} posts queued for specialized processing`
    };

    console.log('🎉 Optimized automatic reprocessing completed successfully');
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in execute-dataset-reprocessing:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Unknown error during optimized reprocessing'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

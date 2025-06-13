
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
    console.log('🚀 N8N Batch Processor - Starting');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { dataset_id } = await req.json();
    
    if (!dataset_id) {
      throw new Error('Dataset ID is required');
    }

    console.log(`📊 Processing batches for dataset: ${dataset_id}`);

    // Récupérer la tâche de traitement
    const { data: task, error: taskError } = await supabaseClient
      .from('dataset_processing_tasks')
      .select('*')
      .eq('dataset_id', dataset_id)
      .eq('status', 'pending')
      .single();

    if (taskError || !task) {
      throw new Error(`No pending task found for dataset ${dataset_id}`);
    }

    const items = task.batch_data || [];
    if (items.length === 0) {
      throw new Error('No items to process in task');
    }

    // Marquer la tâche comme en cours
    await supabaseClient
      .from('dataset_processing_tasks')
      .update({ 
        status: 'processing',
        started_processing_at: new Date().toISOString()
      })
      .eq('id', task.id);

    console.log(`📥 Processing ${items.length} items in batches`);

    const N8N_WEBHOOK_URL = 'https://n8n.getpro.co/webhook/ce694cea-07a6-4b38-a2a9-eb1ffd6fd14c';
    const N8N_BATCH_SIZE = 100;
    const DELAY_BETWEEN_BATCHES = 10000; // 10 secondes
    
    let batchesSent = 0;
    let batchErrors = 0;
    const totalBatches = Math.ceil(items.length / N8N_BATCH_SIZE);

    // Traitement par batch avec délais
    for (let i = 0; i < items.length; i += N8N_BATCH_SIZE) {
      const batch = items.slice(i, i + N8N_BATCH_SIZE);
      const batchNumber = Math.floor(i / N8N_BATCH_SIZE) + 1;
      const batchId = `${dataset_id}_batch_${batchNumber}_${Date.now()}`;
      
      try {
        console.log(`📤 Sending batch ${batchNumber}/${totalBatches} to n8n (${batch.length} items)`);
        
        const response = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            batch_id: batchId,
            dataset_id: dataset_id,
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
        });

        if (response.ok) {
          batchesSent++;
          console.log(`✅ Batch ${batchId} sent successfully to n8n`);
          
          // Mettre à jour le progrès
          await supabaseClient
            .from('dataset_processing_tasks')
            .update({ 
              batches_sent: batchesSent,
              last_batch_sent_at: new Date().toISOString()
            })
            .eq('id', task.id);
            
        } else {
          batchErrors++;
          console.error(`❌ Error sending batch ${batchId} to n8n: ${response.status} ${response.statusText}`);
        }

        // Délai entre les batches (sauf pour le dernier)
        if (i + N8N_BATCH_SIZE < items.length) {
          console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES / 1000}s before next batch...`);
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }

      } catch (error) {
        batchErrors++;
        console.error(`❌ Exception sending batch ${batchId} to n8n:`, error?.message);
      }
    }

    // Marquer la tâche comme terminée
    const finalStatus = batchErrors === 0 ? 'completed' : 'completed_with_errors';
    await supabaseClient
      .from('dataset_processing_tasks')
      .update({ 
        status: finalStatus,
        batches_sent: batchesSent,
        batch_errors: batchErrors,
        completed_at: new Date().toISOString()
      })
      .eq('id', task.id);

    console.log(`🎉 N8N Batch Processing completed: ${batchesSent}/${totalBatches} batches sent successfully`);

    return new Response(JSON.stringify({ 
      success: true,
      dataset_id: dataset_id,
      total_batches: totalBatches,
      batches_sent: batchesSent,
      batch_errors: batchErrors,
      processing_status: finalStatus,
      message: `Batch processing completed for dataset ${dataset_id}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in n8n-batch-processor:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

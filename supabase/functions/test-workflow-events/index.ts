
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { WorkflowEventEmitter } from '../shared/workflow-events.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action = 'test' } = await req.json();

    if (action === 'test') {
      console.log('🧪 Testing workflow events insertion...');
      
      const eventEmitter = new WorkflowEventEmitter(supabaseClient);
      const testPostId = crypto.randomUUID();
      const testCorrelationId = `test_${Date.now()}`;
      
      // Test insertion d'événements
      await eventEmitter.emitStepStarted(
        testPostId,
        testCorrelationId,
        'step1',
        { test: true, dataset_id: 'test_dataset' }
      );
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await eventEmitter.emitStepCompleted(
        testPostId,
        testCorrelationId,
        'step1',
        1500,
        { recrute_poste: 'oui', postes_count: 2 }
      );
      
      // Vérifier l'insertion
      const { data: events, error } = await supabaseClient
        .from('workflow_events')
        .select('*')
        .eq('correlation_id', testCorrelationId);
      
      if (error) {
        throw new Error(`Error checking events: ${error.message}`);
      }
      
      console.log(`✅ Test events inserted: ${events?.length || 0} events`);
      
      return new Response(JSON.stringify({
        success: true,
        events_inserted: events?.length || 0,
        events: events,
        test_correlation_id: testCorrelationId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'check_table') {
      // Vérifier la structure de la table et les données existantes
      const { data: tableData, error: tableError } = await supabaseClient
        .from('workflow_events')
        .select('*')
        .limit(10);
      
      if (tableError) {
        throw new Error(`Error reading table: ${tableError.message}`);
      }
      
      const { count, error: countError } = await supabaseClient
        .from('workflow_events')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        throw new Error(`Error counting records: ${countError.message}`);
      }
      
      return new Response(JSON.stringify({
        success: true,
        total_records: count,
        sample_records: tableData,
        table_accessible: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('❌ Error in test-workflow-events:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

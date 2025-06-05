
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getPipelineBottlenecks } from '../shared/workflow-events.ts'

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

    const { action, dataset_id, post_id } = await req.json();

    switch (action) {
      case 'get_bottlenecks':
        const bottlenecks = await getPipelineBottlenecks(supabaseClient, dataset_id);
        return new Response(JSON.stringify(bottlenecks), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'get_post_timeline':
        if (!post_id) {
          throw new Error('post_id is required for timeline');
        }
        
        const { data: timeline, error } = await supabaseClient
          .from('workflow_events')
          .select('*')
          .eq('post_id', post_id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        return new Response(JSON.stringify({ timeline }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'get_step_performance':
        const { data: stepData, error: stepError } = await supabaseClient
          .from('workflow_events')
          .select('step_name, event_type, duration_ms, created_at')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .not('duration_ms', 'is', null);

        if (stepError) throw stepError;

        // Calculate performance metrics per step
        const stepPerformance: any = {};
        stepData?.forEach((event: any) => {
          if (event.event_type === 'step_completed') {
            if (!stepPerformance[event.step_name]) {
              stepPerformance[event.step_name] = {
                total_duration: 0,
                count: 0,
                durations: []
              };
            }
            stepPerformance[event.step_name].total_duration += event.duration_ms;
            stepPerformance[event.step_name].count++;
            stepPerformance[event.step_name].durations.push(event.duration_ms);
          }
        });

        // Calculate averages and medians
        Object.keys(stepPerformance).forEach(step => {
          const metrics = stepPerformance[step];
          metrics.avg_duration = metrics.total_duration / metrics.count;
          
          // Calculate median
          const sorted = metrics.durations.sort((a: number, b: number) => a - b);
          const mid = Math.floor(sorted.length / 2);
          metrics.median_duration = sorted.length % 2 === 0 
            ? (sorted[mid - 1] + sorted[mid]) / 2 
            : sorted[mid];
            
          delete metrics.durations; // Remove raw data
        });

        return new Response(JSON.stringify({ step_performance: stepPerformance }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Error in workflow-analytics:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

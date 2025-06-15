
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Attendu : { search_type: "personna", search_id: "...", personas: [...] }
    const { search_type, search_id, personas } = body;

    if (search_type !== 'personna' || !search_id || !Array.isArray(personas)) {
      return new Response(JSON.stringify({ success: false, error: 'Payload invalide (search_type/personas/search_id requis)' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // On upsert les personas sur la table job_search_personas
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Vérifie si une entrée existe déjà pour ce search_id
    const { data: existing, error: errorSelect } = await supabase
      .from('job_search_personas')
      .select('id')
      .eq('search_id', search_id)
      .maybeSingle();

    let upsertResult;

    if (existing) {
      // Mise à jour
      upsertResult = await supabase
        .from('job_search_personas')
        .update({
          personas,
          status: 'loaded',
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('search_id', search_id);
    } else {
      // Insertion
      upsertResult = await supabase
        .from('job_search_personas')
        .insert({
          search_id,
          personas,
          status: 'loaded',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }

    if (upsertResult.error) {
      return new Response(JSON.stringify({ success: false, error: upsertResult.error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error('Erreur générique (personna-callback):', err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

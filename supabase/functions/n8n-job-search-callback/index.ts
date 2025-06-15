
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handlePersonaSearch } from './persona-search.ts';
import { insertJobResults } from './insert-job-results.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { search_id, results, all_results_returned } = body;

    // Signal de fin de scraping
    if (
      search_id &&
      Array.isArray(results) &&
      results.length === 0 &&
      all_results_returned === true
    ) {
      return await handlePersonaSearch({ search_id, supabase, corsHeaders });
    }

    // Sécurité : format attendu
    if (!search_id || !Array.isArray(results)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Payload invalide (search_id et results requis)' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Traitement normal : insertion des résultats
    if (results.length > 0) {
      const { error } = await insertJobResults({
        search_id,
        results,
        supabase,
        corsHeaders
      });
      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error('Erreur générale (n8n-job-search-callback) :', err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
// fin du fichier


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

  // Ceci gère l'appel POST de n8n avec les résultats de job search
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();

    // On suppose que le payload est de la forme :
    // {
    //   search_id: "uuid de la sauvegarde de recherche",
    //   results: [
    //     {
    //       job_title: "...",
    //       company_name: "...",
    //       location: "...",
    //       posted_date: "...", // Format ISO !
    //       job_description: "...",
    //       job_url: "...",
    //       personas: [ ... ],
    //       company_logo: "...",
    //       company_id: "..."      <----- nouveau champ pris en charge
    //     }, ...
    //   ]
    // }
    const { search_id, results } = body;

    if (!search_id || !Array.isArray(results)) {
      return new Response(JSON.stringify({ success: false, error: 'Payload invalide (search_id et results requis)' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // On mappe les résultats pour les insérer en masse dans la table job_search_results, inclut company_logo et company_id !
    const rows = results.map((result: any) => ({
      search_id: search_id,
      job_title: result.job_title,
      company_name: result.company_name,
      location: result.location,
      posted_date: result.posted_date,
      job_description: result.job_description,
      job_url: result.job_url,
      company_logo: result.company_logo ?? null, // <-- PRIS EN CHARGE !
      company_id: result.company_id ?? null,     // <-- NOUVEAU CHAMP !
      personas: JSON.stringify(result.personas ?? []),
    }));

    const { error } = await supabase
      .from('job_search_results')
      .insert(rows);

    if (error) {
      console.error('Erreur lors de l\'insertion des résultats jobs :', error);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error('Erreur générale (n8n-job-search-callback) :', err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

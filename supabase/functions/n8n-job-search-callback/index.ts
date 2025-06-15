
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();

    const { search_id, results, all_results_returned } = body;

    // Nouvelle logique : signal de fin de scraping
    if (
      search_id &&
      Array.isArray(results) &&
      results.length === 0 &&
      all_results_returned === true
    ) {
      // 1. Récupérer tous les jobs de la recherche avec leurs infos pour persona
      const { data: jobs, error: jobsError } = await supabase
        .from('job_search_results')
        .select('id, job_title, company_name, company_id, location')
        .eq('search_id', search_id);

      if (jobsError) {
        console.error('Erreur lors de la récupération des jobs pour persona search :', jobsError);
        return new Response(JSON.stringify({ success: false, error: jobsError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 2. Récupérer les filters personas de la recherche
      const { data: search, error: searchError } = await supabase
        .from('saved_job_searches')
        .select('persona_filters')
        .eq('id', search_id)
        .maybeSingle();

      if (searchError) {
        console.error('Erreur lors de la récupération des persona_filters:', searchError);
        return new Response(JSON.stringify({ success: false, error: searchError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const personaFilters = search?.persona_filters ?? null;

      // 3. Appel webhook N8N pour lancer persona search (exemple groupé)
      // Modifie ici l'URL si tu veux utiliser une URL différente
      const N8N_PERSONA_WEBHOOK_URL = "https://n8n.getpro.co/webhook/fb2a74b3-e840-400c-b788-f43972c61334";

      if (jobs && Array.isArray(jobs) && jobs.length > 0 && personaFilters) {
        // Pour chaque job, on envoie la demande à N8N (en série, pour éviter la saturation)
        for (const job of jobs) {
          try {
            await fetch(N8N_PERSONA_WEBHOOK_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                search_type: "personna",
                search_id,
                job_id: job.id,
                company_name: job.company_name,
                company_id: job.company_id,
                personna_filters: personaFilters,
              }),
            });
          } catch (err) {
            console.error('Erreur lors de l’appel au webhook N8N persona search pour le job', job.id, ':', err);
          }
        }
      } else {
        console.warn('Aucun job ou persona_filters non trouvé, aucun persona search lancé.', { jobs, personaFilters });
      }

      return new Response(JSON.stringify({ success: true, persona_search_launched: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Sécurité : format attendu
    if (!search_id || !Array.isArray(results)) {
      return new Response(JSON.stringify({ success: false, error: 'Payload invalide (search_id et results requis)' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Traitement normal : on insère les résultats (company_id et company_logo compris)
    if (results.length > 0) {
      const rows = results.map((result: any) => ({
        search_id: search_id,
        job_title: result.job_title,
        company_name: result.company_name,
        location: result.location,
        posted_date: result.posted_date,
        job_description: result.job_description,
        job_url: result.job_url,
        company_logo: result.company_logo ?? null,
        company_id: result.company_id ?? null,
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

// fin du fichier

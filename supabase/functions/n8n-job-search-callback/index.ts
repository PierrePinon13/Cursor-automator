
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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

    // LOG BODY REÇU (debug extrême)
    console.log('[n8n-job-search-callback] Payload reçu :', JSON.stringify(body));

    const { search_id, results, all_results_returned } = body;

    // LOG DES PARAMS DE CONDITION
    console.log('Check end-of-search condition :', {
      search_id_type: typeof search_id,
      results_type: Array.isArray(results),
      results_length: results?.length,
      all_results_returned_type: typeof all_results_returned,
      all_results_returned_value: all_results_returned
    });

    // 🚦 LOGIQUE: Déclenchement de la recherche de personas quand le scraping est terminé
    if (
      search_id &&
      Array.isArray(results) &&
      results.length === 0 &&
      all_results_returned === true
    ) {
      console.log('Déclenchement recherche personas: search_id=', search_id);

      // 1. Récupérer tous les jobs non encore traités pour les personas
      const { data: jobResults, error: jobResultsErr } = await supabase
        .from('job_search_results')
        .select('company_id, job_id')
        .eq('search_id', search_id)
        .eq('personnas_searched', false)
        .not('company_id', 'is', null);

      if (jobResultsErr) {
        console.error('Erreur lors de la récupération des job_search_results:', jobResultsErr);
        return new Response(
          JSON.stringify({ success: false, error: jobResultsErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log('Jobs non traités pour personas:', (jobResults || []).length);

      // Extraction des company_ids uniques
      const uniqueCompanyIds = [...new Set(
        (jobResults || [])
          .map(res => res.company_id)
          .filter(id => id && typeof id === "string")
      )];

      console.log('Company IDs uniques à traiter:', uniqueCompanyIds);

      if (uniqueCompanyIds.length === 0) {
        console.log("Aucune nouvelle company à traiter pour les personas.");
        return new Response(
          JSON.stringify({ success: true, persona_search_launched: false, reason: 'no_companies' }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 2. Récupérer les filtres personas de la recherche
      const { data: search, error: searchErr } = await supabase
        .from('saved_job_searches')
        .select('persona_filters')
        .eq('id', search_id)
        .maybeSingle();

      if (searchErr) {
        console.error('Erreur lors de la récupération des persona_filters:', searchErr);
        return new Response(
          JSON.stringify({ success: false, error: searchErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log('Persona filters récupérés:', search?.persona_filters);

      // 3. Appel du webhook N8N pour la recherche de personas
      const N8N_PERSONA_WEBHOOK_URL = "https://n8n.getpro.co/webhook/fb2a74b3-e840-400c-b788-f43972c61334";

      const payloadToSend = {
        search_id,
        company_ids: uniqueCompanyIds,
        persona_filters: search?.persona_filters || {}
      };

      console.log('Payload envoyé vers N8N personas:', JSON.stringify(payloadToSend));

      let n8nResponse: Response | undefined;
      try {
        n8nResponse = await fetch(N8N_PERSONA_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadToSend),
        });
        console.log("Webhook N8N personas - status:", n8nResponse.status);
      } catch (err) {
        console.error('Erreur lors de l\'appel au webhook N8N personas:', err);
      }

      // 4. Marquer les jobs comme traités pour les personas
      const jobIdsToUpdate = (jobResults || [])
        .map(res => res.job_id)
        .filter(id => id && typeof id === "string");

      if (jobIdsToUpdate.length > 0) {
        const { error: updateErr } = await supabase
          .from('job_search_results')
          .update({ personnas_searched: true })
          .in('job_id', jobIdsToUpdate)
          .eq('search_id', search_id);
        
        if (updateErr) {
          console.error("Erreur lors de la mise à jour personnas_searched:", updateErr);
        } else {
          console.log("Marqué comme traité pour personas:", jobIdsToUpdate.length, "jobs");
        }
      }

      // 5. Mettre à jour le compteur de résultats dans saved_job_searches
      const { count: totalResults } = await supabase
        .from('job_search_results')
        .select('*', { count: 'exact', head: true })
        .eq('search_id', search_id);

      if (totalResults !== null) {
        await supabase
          .from('saved_job_searches')
          .update({ results_count: totalResults })
          .eq('id', search_id);
        console.log("Compteur de résultats mis à jour:", totalResults);
      }

      console.log("✅ Recherche personas lancée pour", uniqueCompanyIds.length, "companies | search_id:", search_id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          persona_search_launched: true, 
          company_ids: uniqueCompanyIds,
          webhook_status: n8nResponse?.status
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sécurité : format attendu
    if (!search_id || !Array.isArray(results)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Payload invalide (search_id et results requis)' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Traitement normal : insertion des résultats
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
      
      console.log(`Résultats insérés pour search_id=${search_id}, count=${results.length}`);

      // Mettre à jour le compteur de résultats
      const { count: totalResults } = await supabase
        .from('job_search_results')
        .select('*', { count: 'exact', head: true })
        .eq('search_id', search_id);

      if (totalResults !== null) {
        await supabase
          .from('saved_job_searches')
          .update({ results_count: totalResults })
          .eq('id', search_id);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error('Erreur générale (n8n-job-search-callback) :', err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

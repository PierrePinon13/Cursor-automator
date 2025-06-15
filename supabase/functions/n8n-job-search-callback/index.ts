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

    // 🚦 NOUVELLE LOGIQUE: Traitement de fin de scraping => recherche de personas par COMPANY IDs
    if (
      search_id &&
      Array.isArray(results) &&
      results.length === 0 &&
      all_results_returned === true
    ) {
      console.log('Trigger persona search: search_id=', search_id);

      // 1. On récupère tous les jobs liés à la search qui n'ont pas encore été recherchés (personnas_searched = false)
      const { data: jobResults, error: jobResultsErr } = await supabase
        .from('job_search_results')
        .select('company_id, job_id')
        .eq('search_id', search_id)
        .eq('personnas_searched', false);

      if (jobResultsErr) {
        console.error('Erreur lors de la récupération des job_search_results:', jobResultsErr);
        return new Response(
          JSON.stringify({ success: false, error: jobResultsErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log('job_search_results PERSONA-RECHERCHE à lancer (non recherchés):', (jobResults || []).length);

      // Extraction company_ids uniques et non nulles
      const uniqueCompanyIds: string[] = [];
      const jobIdsToUpdate: string[] = [];
      (jobResults || []).forEach(res => {
        if (res.company_id && typeof res.company_id === "string" && !uniqueCompanyIds.includes(res.company_id)) {
          uniqueCompanyIds.push(res.company_id);
        }
        // Stocker aussi les job_id pour le update après
        if (res.job_id && typeof res.job_id === "string") {
          jobIdsToUpdate.push(res.job_id);
        }
      });
      console.log('Unique company_ids (not searched):', uniqueCompanyIds);
      console.log('job_ids à mettre à jour (personnas_searched = true):', jobIdsToUpdate);

      // Si tout a déjà été recherché, on ne fait rien
      if (uniqueCompanyIds.length === 0) {
        console.log("Aucune nouvelle job offer à envoyer vers la recherche de personas (tout est traité).");
        return new Response(
          JSON.stringify({ success: true, persona_company_search_launched: false, already_done: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 3. On récupère les filters personas de la recherche
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
      console.log('persona_filters:', search?.persona_filters);

      // 4. Construction et POST N8N
      const N8N_PERSONA_WEBHOOK_URL = "https://n8n.getpro.co/webhook/fb2a74b3-e840-400c-b788-f43972c61334";

      const payloadToSend = {
        search_id,
        company_ids: uniqueCompanyIds,
        persona_filters: search?.persona_filters ?? {},
      };

      let n8nResponse: Response | undefined;
      try {
        n8nResponse = await fetch(N8N_PERSONA_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadToSend),
        });
        console.log("Webhook N8N personas response status:", n8nResponse.status);
      } catch (err) {
        console.error('Erreur lors de l’appel au webhook N8N personas/company :', err);
      }

      // 5. Mise à jour des job_search_results : personnas_searched à true pour ces jobs
      if (jobIdsToUpdate.length > 0) {
        const { error: updateErr } = await supabase
          .from('job_search_results')
          .update({ personnas_searched: true })
          .in('job_id', jobIdsToUpdate)
          .eq('search_id', search_id);
        if (updateErr) {
          console.error("Erreur lors de la mise à jour personnas_searched:", updateErr);
        } else {
          console.log("personnas_searched mis à true pour job_ids:", jobIdsToUpdate.length);
        }
      }

      console.log("✅ Webhook N8N personas lancé pour compagnie_ids:", uniqueCompanyIds.length, "| search_id:", search_id, "| resp status:", n8nResponse?.status);

      return new Response(
        JSON.stringify({ success: true, persona_company_search_launched: true, company_ids: uniqueCompanyIds }),
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

    // Traitement normal : insertion des résultats (avec dédoublonnage/anti-doublons dans insertJobResults)
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
      console.log(`Résultats insérés/upsertés pour search_id=${search_id}, count=${results.length}`);
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

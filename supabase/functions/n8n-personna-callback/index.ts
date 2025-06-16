
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
    console.log('📥 Received persona callback payload:', JSON.stringify(body, null, 2));

    // Format attendu : { search_id: "...", company_id: "...", results: [...] }
    const { search_id, company_id, results } = body;

    if (!search_id || !company_id || !Array.isArray(results)) {
      console.error('❌ Invalid payload format. Expected: { search_id, company_id, results }');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Payload invalide. Format attendu: { search_id, company_id, results }' 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`🔍 Processing ${results.length} personas for company_id=${company_id}, search_id=${search_id}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Mettre à jour les job_search_results correspondants avec les personas trouvées
    const { data: jobResults, error: fetchError } = await supabase
      .from('job_search_results')
      .select('id, job_id')
      .eq('search_id', search_id)
      .eq('company_id', company_id);

    if (fetchError) {
      console.error('❌ Error fetching job results:', fetchError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Erreur lors de la récupération des résultats: ${fetchError.message}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!jobResults || jobResults.length === 0) {
      console.warn(`⚠️ No job results found for search_id=${search_id} and company_id=${company_id}`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Aucun résultat d\'emploi correspondant trouvé',
        personas_processed: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`✅ Found ${jobResults.length} job result(s) to update with personas`);

    // Mettre à jour chaque job_search_result avec les personas
    let updatedCount = 0;
    for (const jobResult of jobResults) {
      const { error: updateError } = await supabase
        .from('job_search_results')
        .update({ 
          personas: results,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobResult.id);

      if (updateError) {
        console.error(`❌ Error updating job result ${jobResult.id}:`, updateError);
      } else {
        console.log(`✅ Updated job result ${jobResult.id} with ${results.length} personas`);
        updatedCount++;
      }
    }

    // Sauvegarder aussi dans la table job_search_personas pour un suivi global
    // Utiliser les colonnes au lieu du nom de la contrainte pour l'upsert
    const { error: upsertError } = await supabase
      .from('job_search_personas')
      .upsert({
        search_id,
        company_id,
        personas: results,
        status: 'loaded',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'search_id,company_id'
      });

    if (upsertError) {
      console.error('⚠️ Error upserting to job_search_personas:', upsertError);
      // Non-bloquant, on continue
    } else {
      console.log(`✅ Upserted personas data for search_id=${search_id} and company_id=${company_id}`);
    }

    // Déclencher un événement pour informer le frontend de la mise à jour
    console.log(`🔔 Triggering persona update event for search_id=${search_id}`);

    console.log(`🎉 Persona callback completed successfully. Updated ${updatedCount}/${jobResults.length} job results`);

    return new Response(JSON.stringify({ 
      success: true,
      search_id,
      company_id,
      personas_received: results.length,
      job_results_updated: updatedCount,
      message: `${results.length} personas traitées pour l'entreprise ${company_id}`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error('💥 Error in persona callback:', err);
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Erreur serveur: ${String(err)}` 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});


import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function handlePersonaSearch({
  search_id,
  supabase,
  corsHeaders
}: {
  search_id: string,
  supabase: any,
  corsHeaders: Record<string, string>
}) {
  // 1. Récupérer tous les jobs de la recherche avec leurs infos pour persona
  const { data: jobs, error: jobsError } = await supabase
    .from('job_search_results')
    .select('id, job_title, company_name, company_id, location')
    .eq('search_id', search_id);

  if (jobsError) {
    console.error('Erreur lors de la récupération des jobs pour persona search :', jobsError);
    return new Response(
      JSON.stringify({ success: false, error: jobsError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 2. Récupérer les filters personas de la recherche
  const { data: search, error: searchError } = await supabase
    .from('saved_job_searches')
    .select('persona_filters')
    .eq('id', search_id)
    .maybeSingle();

  if (searchError) {
    console.error('Erreur lors de la récupération des persona_filters:', searchError);
    return new Response(
      JSON.stringify({ success: false, error: searchError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const personaFilters = search?.persona_filters ?? null;

  // Appel webhook N8N pour lancer persona search (looping on jobs)
  const N8N_PERSONA_WEBHOOK_URL = "https://n8n.getpro.co/webhook/fb2a74b3-e840-400c-b788-f43972c61334";

  if (jobs && Array.isArray(jobs) && jobs.length > 0 && personaFilters) {
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

  return new Response(
    JSON.stringify({ success: true, persona_search_launched: true }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

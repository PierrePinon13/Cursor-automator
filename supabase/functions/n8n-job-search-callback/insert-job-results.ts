
export async function insertJobResults({
  search_id,
  results,
  supabase,
  corsHeaders
}: {
  search_id: string,
  results: any[],
  supabase: any,
  corsHeaders: Record<string, string>
}) {
  if (!results.length) return { error: null };

  // Dédoublonnage STRICTEMENT sur job_id
  const seen = new Set();
  const dedupedResults = results.filter((result: any) => {
    // Uniquement les résultats avec un job_id
    if (!result.job_id) return false;
    const key = String(result.job_id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // On log le nombre de doublons ignorés
  if (dedupedResults.length < results.length) {
    console.log(`insertJobResults: Doublons retirés (job_id) lors de l'insertion: ${results.length - dedupedResults.length}`);
  }

  const rows = dedupedResults.map((result: any) => ({
    search_id,
    job_id: result.job_id,
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

  // Faire un upsert sur search_id + job_id
  const { error } = await supabase
    .from('job_search_results')
    .upsert(rows, { onConflict: 'search_id,job_id' });

  if (error) {
    console.error('Erreur lors du upsert des résultats jobs :', error);
    return { error };
  }
  return { error: null };
}

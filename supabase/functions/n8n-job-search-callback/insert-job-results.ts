
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

  // Dédoublonnage en mémoire par job_url (ou job_id si existant)
  const seen = new Set();
  const dedupedResults = results.filter((result: any) => {
    // Utiliser job_url comme identifiant principal
    const key = result.job_id ? `${result.job_id}` : (result.job_url ? result.job_url : null);
    if (!key) return false; // Si pas d'identifiant : skip
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // On log le nombre de doublons ignorés
  if (dedupedResults.length < results.length) {
    console.log(`insertJobResults: Doublons retirés lors de l'insertion: ${results.length - dedupedResults.length}`);
  }

  const rows = dedupedResults.map((result: any) => ({
    search_id,
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

  // Faire un upsert (via insert + onConflict) sur search_id + job_url
  const { error } = await supabase
    .from('job_search_results')
    .upsert(rows, { onConflict: 'search_id,job_url' });

  if (error) {
    console.error('Erreur lors du upsert des résultats jobs :', error);
    return { error };
  }
  return { error: null };
}

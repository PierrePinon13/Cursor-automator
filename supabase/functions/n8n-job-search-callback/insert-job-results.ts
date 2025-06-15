
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

  const rows = results.map((result: any) => ({
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

  const { error } = await supabase
    .from('job_search_results')
    .insert(rows);

  if (error) {
    console.error('Erreur lors de l\'insertion des résultats jobs :', error);
    return { error };
  }
  return { error: null };
}

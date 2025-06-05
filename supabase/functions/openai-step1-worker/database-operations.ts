
export async function updatePostStep1Results(supabaseClient: any, postId: string, result: any, fullResponse: any) {
  const normalizedResponse = result.recrute_poste?.toLowerCase() === 'oui' ? 'oui' : 'non';
  const newStatus = normalizedResponse === 'oui' ? 'processing' : 'not_job_posting';

  await supabaseClient
    .from('linkedin_posts')
    .update({
      openai_step1_recrute_poste: normalizedResponse,
      openai_step1_postes: result.postes,
      openai_step1_response: fullResponse,
      processing_status: newStatus,
      last_updated_at: new Date().toISOString()
    })
    .eq('id', postId);

  return { normalizedResponse, newStatus };
}

export async function markPostAsError(supabaseClient: any, postId: string) {
  await supabaseClient
    .from('linkedin_posts')
    .update({
      processing_status: 'error',
      retry_count: supabaseClient.rpc('increment', { x: 1 }),
      last_retry_at: new Date().toISOString()
    })
    .eq('id', postId);
}

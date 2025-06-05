
export async function handleUnipileError(supabaseClient: any, postId: string, error: any) {
  console.error(`❌ Unipile error for post ${postId}:`, error);
  
  await supabaseClient
    .from('linkedin_posts')
    .update({
      processing_status: 'error',
      retry_count: supabaseClient.rpc('increment', { x: 1 }),
      last_retry_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString()
    })
    .eq('id', postId);
}

export async function triggerLeadCreation(supabaseClient: any, postId: string, datasetId: string) {
  try {
    console.log(`🚀 Triggering lead creation for post ${postId}`);
    
    // Déclencher la création de lead via specialized-lead-worker
    await supabaseClient.functions.invoke('specialized-lead-worker', {
      body: {
        post_id: postId,
        dataset_id: datasetId,
        action: 'create_lead'
      }
    });
    
    console.log(`✅ Lead creation triggered for post ${postId}`);
  } catch (error) {
    console.error(`❌ Error triggering lead creation for post ${postId}:`, error);
  }
}

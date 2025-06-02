
export async function handleUnipileError(supabaseClient: any, postId: string, error: any) {
  let errorType = 'temporary_error';
  
  if (error.message.includes('429')) {
    errorType = 'unipile_rate_limit';
  } else if (error.message.includes('provider_error')) {
    errorType = 'unipile_provider_error';
  } else if (error.message.includes('401') || error.message.includes('403')) {
    errorType = 'permanent_error';
  }

  await supabaseClient
    .from('linkedin_posts')
    .update({
      processing_status: errorType === 'permanent_error' ? 'error' : 'retry_scheduled',
      retry_count: supabaseClient.rpc('increment', { x: 1 }),
      last_retry_at: new Date().toISOString()
    })
    .eq('id', postId);
}

export async function triggerLeadCreation(supabaseClient: any, postId: string, datasetId: string) {
  console.log(`🎯 Triggering lead creation for post: ${postId}`);
  
  supabaseClient.functions.invoke('specialized-lead-worker', {
    body: { 
      post_id: postId, 
      dataset_id: datasetId
    }
  }).catch((err: any) => {
    console.error(`Error triggering lead worker for ${postId}:`, err);
  });
}

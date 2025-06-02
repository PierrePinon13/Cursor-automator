
export async function triggerNextStep(supabaseClient: any, post: any, currentStep: string, result: any) {
  console.log(`🔄 Triggering next step after ${currentStep}...`);
  
  switch (currentStep) {
    case 'step1':
      if (result.recrute_poste === 'oui') {
        // Déclencher Step 2
        supabaseClient.functions.invoke('specialized-openai-worker', {
          body: { 
            post_id: post.id, 
            dataset_id: post.apify_dataset_id,
            step: 'step2'
          }
        }).catch((err: any) => console.error('Error triggering step2:', err));
      } else {
        // Marquer comme non pertinent
        await supabaseClient
          .from('linkedin_posts')
          .update({ processing_status: 'not_job_posting' })
          .eq('id', post.id);
      }
      break;
      
    case 'step2':
      if (result.reponse === 'oui') {
        // Déclencher Step 3
        supabaseClient.functions.invoke('specialized-openai-worker', {
          body: { 
            post_id: post.id, 
            dataset_id: post.apify_dataset_id,
            step: 'step3'
          }
        }).catch((err: any) => console.error('Error triggering step3:', err));
      } else {
        // Marquer comme filtré
        await supabaseClient
          .from('linkedin_posts')
          .update({ processing_status: 'filtered_out' })
          .eq('id', post.id);
      }
      break;
      
    case 'step3':
      // Déclencher le scraping Unipile
      supabaseClient.functions.invoke('specialized-unipile-worker', {
        body: { 
          post_id: post.id, 
          dataset_id: post.apify_dataset_id
        }
      }).catch((err: any) => console.error('Error triggering unipile worker:', err));
      break;
  }
}

export async function handleOpenAIError(supabaseClient: any, postId: string, step: string, error: any) {
  let errorType = 'temporary_error';
  
  if (error.message.includes('429')) {
    errorType = 'openai_rate_limit';
  } else if (error.message.includes('timeout')) {
    errorType = 'openai_timeout';
  } else if (error.message.includes('400') || error.message.includes('401')) {
    errorType = 'permanent_error';
  }

  const retryConfig = {
    openai_rate_limit: { delay: 60000, max_retries: 5 },
    openai_timeout: { delay: 30000, max_retries: 3 },
    temporary_error: { delay: 60000, max_retries: 3 },
    permanent_error: { delay: 0, max_retries: 0 }
  };

  const config = retryConfig[errorType as keyof typeof retryConfig];
  
  await supabaseClient
    .from('linkedin_posts')
    .update({
      processing_status: config.max_retries > 0 ? 'retry_scheduled' : 'error',
      retry_count: supabaseClient.rpc('increment', { x: 1 }),
      last_retry_at: new Date().toISOString()
    })
    .eq('id', postId);
}

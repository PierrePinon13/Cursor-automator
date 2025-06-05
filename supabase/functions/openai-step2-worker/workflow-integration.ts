
// Workflow integration utilities for Step 2
export async function triggerWorkflowIfEnabled(
  supabaseClient: any, 
  postId: string, 
  result: any, 
  datasetId?: string, 
  workflowEnabled = false
) {
  if (!workflowEnabled) return;

  try {
    await orchestrateWorkflow(supabaseClient, postId, 'step2_completed', result, datasetId);
    console.log(`✅ Workflow triggered for post: ${postId}`);
  } catch (error) {
    console.error(`❌ Error triggering workflow for post ${postId}:`, error);
  }
}

// Simplified workflow orchestration for Step 2
async function orchestrateWorkflow(supabaseClient: any, postId: string, currentStep: string, result: any, datasetId?: string) {
  console.log(`🎯 Orchestrating workflow - Post: ${postId}, Current step: ${currentStep}`);
  
  try {
    if (currentStep === 'step2_completed') {
      if (result.reponse === 'oui' || result.reponse === 'yes') {
        console.log(`✅ Step 2 passed for post ${postId}, triggering Step 3`);
        await triggerOpenAIStep3(supabaseClient, postId, datasetId);
      } else {
        console.log(`❌ Step 2 failed for post ${postId}, marking as filtered_out`);
        await markPostStatus(supabaseClient, postId, 'filtered_out');
      }
    }
  } catch (error) {
    console.error(`❌ Error in workflow orchestration for post ${postId}:`, error);
    await handleWorkflowError(supabaseClient, postId, currentStep, error);
  }
}

async function triggerOpenAIStep3(supabaseClient: any, postId: string, datasetId?: string) {
  await supabaseClient.functions.invoke('openai-step3-worker', {
    body: { 
      post_id: postId,
      dataset_id: datasetId,
      workflow_trigger: true
    }
  });
}

async function markPostStatus(supabaseClient: any, postId: string, status: string) {
  await supabaseClient
    .from('linkedin_posts')
    .update({
      processing_status: status,
      last_updated_at: new Date().toISOString()
    })
    .eq('id', postId);
}

async function handleWorkflowError(supabaseClient: any, postId: string, step: string, error: any) {
  console.error(`❌ Workflow error at step ${step} for post ${postId}:`, error);
  
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

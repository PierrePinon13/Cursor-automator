
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
    if (result.reponse === 'oui' || result.reponse === 'yes') {
      console.log(`✅ Step 2 passed for post ${postId}, triggering Step 3`);
      await supabaseClient.functions.invoke('openai-step3-worker', {
        body: { 
          post_id: postId,
          dataset_id: datasetId,
          workflow_trigger: true
        }
      });
    } else {
      console.log(`❌ Step 2 failed for post ${postId}, marking as filtered_out`);
      await supabaseClient
        .from('linkedin_posts')
        .update({
          processing_status: 'filtered_out',
          last_updated_at: new Date().toISOString()
        })
        .eq('id', postId);
    }
    console.log(`✅ Workflow triggered for post: ${postId}`);
  } catch (error) {
    console.error(`❌ Error triggering workflow for post ${postId}:`, error);
  }
}

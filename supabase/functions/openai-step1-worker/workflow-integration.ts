
// Workflow integration utilities for Step 1
export async function triggerWorkflowIfEnabled(
  supabaseClient: any, 
  postId: string, 
  result: any, 
  datasetId?: string, 
  workflowEnabled = false
) {
  if (!workflowEnabled) return;

  try {
    if (result.recrute_poste === 'oui' || result.recrute_poste === 'yes') {
      console.log(`✅ Step 1 passed for post ${postId}, triggering Step 2`);
      await supabaseClient.functions.invoke('openai-step2-worker', {
        body: { 
          post_id: postId,
          dataset_id: datasetId,
          workflow_trigger: true
        }
      });
    } else {
      console.log(`❌ Step 1 failed for post ${postId}, marking as not_job_posting`);
      await supabaseClient
        .from('linkedin_posts')
        .update({
          processing_status: 'not_job_posting',
          last_updated_at: new Date().toISOString()
        })
        .eq('id', postId);
    }
    console.log(`✅ Workflow triggered for post: ${postId}`);
  } catch (error) {
    console.error(`❌ Error triggering workflow for post ${postId}:`, error);
  }
}

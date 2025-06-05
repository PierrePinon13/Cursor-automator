
export async function triggerWorkflowIfEnabled(
  supabaseClient: any, 
  postId: string, 
  result: any, 
  datasetId?: string, 
  workflowEnabled = false
) {
  if (!workflowEnabled) return;

  try {
    const { orchestrateWorkflow } = await import('../processing-queue-manager/workflow-orchestrator.ts');
    await orchestrateWorkflow(supabaseClient, postId, 'step1_completed', result, datasetId);
    console.log(`✅ Workflow triggered for post: ${postId}`);
  } catch (error) {
    console.error(`❌ Error triggering workflow for post ${postId}:`, error);
  }
}


import { callOpenAIStep1 } from './openai-client.ts';
import { updatePostStep1Results, markPostAsError } from './database-operations.ts';
import { triggerWorkflowIfEnabled } from './workflow-integration.ts';

export async function processSinglePost(
  post: any, 
  supabaseClient: any, 
  datasetId?: string,
  workflowEnabled = false
) {
  console.log(`🤖 Processing Step 1 for post: ${post.id}`);
  
  try {
    const { result, fullResponse } = await callOpenAIStep1(post);
    const { normalizedResponse } = await updatePostStep1Results(supabaseClient, post.id, result, fullResponse);
    
    console.log(`✅ Step 1 completed for post: ${post.id} - ${normalizedResponse}`);
    
    // Déclencher workflow si activé
    await triggerWorkflowIfEnabled(supabaseClient, post.id, result, datasetId, workflowEnabled);
    
    return { post_id: post.id, success: true, analysis: result };
    
  } catch (error) {
    console.error(`❌ Step 1 failed for post ${post.id}:`, error);
    await markPostAsError(supabaseClient, post.id);
    throw error;
  }
}


import { callOpenAIStep1 } from './openai-client.ts';
import { updatePostStep1Results, markPostAsError } from './database-operations.ts';
import { triggerWorkflowIfEnabled } from './workflow-integration.ts';

export async function processBatch(
  posts: any[], 
  supabaseClient: any, 
  datasetId?: string,
  workflowEnabled = false
) {
  console.log(`🔥 Processing Step 1 BATCH: ${posts.length} posts`);
  
  let successCount = 0;
  let errorCount = 0;
  const processedPosts = [];
  const errors = [];

  // Traitement par petits batches pour éviter les timeouts
  const CONCURRENT_LIMIT = 5;
  
  for (let i = 0; i < posts.length; i += CONCURRENT_LIMIT) {
    const batch = posts.slice(i, i + CONCURRENT_LIMIT);
    
    const promises = batch.map(async (post) => {
      try {
        console.log(`🤖 Processing Step 1 for post: ${post.id}`);
        
        const { result, fullResponse } = await callOpenAIStep1(post);
        const { normalizedResponse } = await updatePostStep1Results(supabaseClient, post.id, result, fullResponse);
        
        console.log(`✅ Step 1 completed for post: ${post.id} - ${normalizedResponse}`);
        successCount++;
        
        const processedPost = { post_id: post.id, success: true, analysis: result };
        processedPosts.push(processedPost);
        
        // Déclencher workflow si activé
        await triggerWorkflowIfEnabled(supabaseClient, post.id, result, datasetId, workflowEnabled);
        
      } catch (error) {
        console.error(`❌ Step 1 failed for post ${post.id}:`, error);
        await markPostAsError(supabaseClient, post.id);
        errorCount++;
        errors.push({ post_id: post.id, error: error.message });
      }
    });

    await Promise.allSettled(promises);
    
    // Pause entre les batches
    if (i + CONCURRENT_LIMIT < posts.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  console.log(`📊 Step 1 Batch completed: ${successCount} success, ${errorCount} errors`);
  
  return {
    processedPosts,
    errors,
    successCount,
    errorCount
  };
}

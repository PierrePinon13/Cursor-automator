
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { updateProcessingStatus, updateRetryCount, fetchPost } from './database-operations.ts'

const MAX_RETRY_ATTEMPTS = 3;

export async function handleRetryLogic(postId: string, isRetry: boolean) {
  if (!isRetry) return { shouldContinue: true, retryCount: 0 }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const post = await fetchPost(supabaseClient, postId)
  const retryCount = post.retry_count || 0

  if (retryCount >= MAX_RETRY_ATTEMPTS) {
    console.log(`Post ${postId} has reached max retry attempts (${MAX_RETRY_ATTEMPTS}), marking as failed`)
    await updateProcessingStatus(supabaseClient, postId, 'failed_max_retries')
    return { 
      shouldContinue: false, 
      retryCount,
      response: {
        success: false, 
        message: 'Max retry attempts reached',
        postId: postId
      }
    }
  }
  
  await updateRetryCount(supabaseClient, postId, retryCount + 1)
  console.log(`Retry attempt ${retryCount + 1} for post ${postId}`)
  
  return { shouldContinue: true, retryCount: retryCount + 1 }
}

export async function scheduleRetry(postId: string | null, error: any) {
  if (!postId) return

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const post = await fetchPost(supabaseClient, postId)
    const retryCount = post.retry_count || 0
    
    if (retryCount < MAX_RETRY_ATTEMPTS) {
      console.log(`Scheduling retry for post ${postId} (attempt ${retryCount + 1})`)
      await updateProcessingStatus(supabaseClient, postId, 'retry_scheduled')
      await updateRetryCount(supabaseClient, postId, retryCount + 1)
      
      // Schedule retry after 5 minutes
      setTimeout(async () => {
        try {
          await supabaseClient.functions.invoke('process-linkedin-post', {
            body: { postId: postId, isRetry: true }
          })
        } catch (retryError) {
          console.error('Error scheduling retry:', retryError)
        }
      }, 5 * 60 * 1000) // 5 minutes delay
    } else {
      console.log(`Post ${postId} has reached max retry attempts, marking as failed`)
      await updateProcessingStatus(supabaseClient, postId, 'failed_max_retries')
    }
  } catch (retryScheduleError) {
    console.error('Error scheduling retry:', retryScheduleError)
  }
}

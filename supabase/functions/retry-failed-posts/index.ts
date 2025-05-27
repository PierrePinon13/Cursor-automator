
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting retry of failed posts')
    
    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse the incoming request
    const { postIds = null, maxRetries = 3, olderThanMinutes = 30 } = await req.json()

    let query = supabaseClient
      .from('linkedin_posts')
      .select('id, retry_count, created_at, processing_status, last_retry_at')
      .in('processing_status', ['error', 'retry_scheduled'])

    // Filter by specific post IDs if provided
    if (postIds && Array.isArray(postIds)) {
      query = query.in('id', postIds);
    } else {
      // Only retry posts that are older than the specified time to avoid immediate retries
      const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString();
      query = query.lt('created_at', cutoffTime);
    }

    const { data: failedPosts, error: fetchError } = await query
      .order('created_at', { ascending: true })
      .limit(50); // Limit to 50 posts per batch to avoid overwhelming the system

    if (fetchError) {
      console.error('Error fetching failed posts:', fetchError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch posts' 
      }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!failedPosts || failedPosts.length === 0) {
      console.log('No failed posts found to retry');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No failed posts found to retry',
        retriedCount: 0
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${failedPosts.length} failed posts to retry`);

    // Filter posts that haven't exceeded max retries
    const postsToRetry = failedPosts.filter(post => (post.retry_count || 0) < maxRetries);
    
    console.log(`${postsToRetry.length} posts are eligible for retry (under max retry limit of ${maxRetries})`);

    let retriedCount = 0;
    let errors = [];

    // Process retries with a small delay between each to avoid overwhelming the system
    for (const post of postsToRetry) {
      try {
        console.log(`Retrying post ${post.id} (attempt ${(post.retry_count || 0) + 1})`);
        
        const { error: retryError } = await supabaseClient.functions.invoke('process-linkedin-post', {
          body: { postId: post.id, isRetry: true }
        });

        if (retryError) {
          console.error(`Error retrying post ${post.id}:`, retryError);
          errors.push({ postId: post.id, error: retryError.message });
        } else {
          retriedCount++;
          console.log(`Successfully triggered retry for post ${post.id}`);
        }

        // Small delay between retries to avoid overwhelming the system
        if (postsToRetry.indexOf(post) < postsToRetry.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }

      } catch (error) {
        console.error(`Exception retrying post ${post.id}:`, error);
        errors.push({ postId: post.id, error: error.message });
      }
    }

    // Mark posts that have exceeded max retries as permanently failed
    const exceededRetryPosts = failedPosts.filter(post => (post.retry_count || 0) >= maxRetries);
    if (exceededRetryPosts.length > 0) {
      console.log(`Marking ${exceededRetryPosts.length} posts as permanently failed (exceeded max retries)`);
      
      const { error: updateError } = await supabaseClient
        .from('linkedin_posts')
        .update({ processing_status: 'failed_max_retries' })
        .in('id', exceededRetryPosts.map(p => p.id));

      if (updateError) {
        console.error('Error updating posts that exceeded max retries:', updateError);
      }
    }

    console.log(`Retry batch completed. Successfully retried: ${retriedCount}, Errors: ${errors.length}, Permanently failed: ${exceededRetryPosts.length}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Retry batch completed',
      retriedCount: retriedCount,
      totalFound: failedPosts.length,
      eligibleForRetry: postsToRetry.length,
      permanentlyFailed: exceededRetryPosts.length,
      errors: errors
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in retry-failed-posts function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

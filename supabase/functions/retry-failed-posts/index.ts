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
    console.log('Starting retry of posts')
    
    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse the incoming request
    const { 
      postIds = null, 
      maxRetries = 3, 
      olderThanMinutes = 30, 
      investigate = true,
      includePending = false,
      pendingOlderThanMinutes = 60,
      includeCompleted = false,
      completedOlderThanMinutes = 60,
      retryLastHour = false
    } = await req.json()

    // Simple option to retry all posts from the last hour
    if (retryLastHour) {
      console.log('=== RETRY LAST HOUR MODE ===')
      
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      console.log(`Fetching all posts created since: ${oneHourAgo}`);
      
      const { data: recentPosts, error: fetchError } = await supabaseClient
        .from('linkedin_posts')
        .select('id, retry_count, created_at, processing_status, author_name')
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching recent posts:', fetchError);
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch recent posts' 
        }), { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`Found ${recentPosts?.length || 0} posts from the last hour`);
      
      if (recentPosts) {
        recentPosts.forEach(post => {
          console.log(`- ID: ${post.id}, Status: ${post.processing_status}, Created: ${post.created_at}, Author: ${post.author_name}`);
        });
      }

      return await processRetries(supabaseClient, recentPosts || [], 5, false, false);
    }

    // Investigation queries first
    if (investigate) {
      console.log('=== INVESTIGATION MODE ===')
      
      // 1. Count all posts by status
      const { data: statusCounts, error: statusError } = await supabaseClient
        .from('linkedin_posts')
        .select('processing_status')
        .not('processing_status', 'is', null);

      if (statusError) {
        console.error('Error getting status counts:', statusError);
      } else {
        const counts = statusCounts.reduce((acc, post) => {
          acc[post.processing_status] = (acc[post.processing_status] || 0) + 1;
          return acc;
        }, {});
        console.log('Posts by status:', counts);
      }

      // 2. Look for error posts specifically
      const { data: errorPosts, error: errorPostsError } = await supabaseClient
        .from('linkedin_posts')
        .select('id, processing_status, retry_count, created_at, last_retry_at, author_name')
        .in('processing_status', ['error', 'retry_scheduled'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (errorPostsError) {
        console.error('Error getting error posts:', errorPostsError);
      } else {
        console.log(`Found ${errorPosts?.length || 0} posts with error/retry_scheduled status:`);
        errorPosts?.forEach(post => {
          console.log(`- ID: ${post.id}, Status: ${post.processing_status}, Retry Count: ${post.retry_count}, Created: ${post.created_at}, Author: ${post.author_name}`);
        });
      }

      // 3. Check pending posts if includePending is true
      if (includePending) {
        const pendingCutoffTime = new Date(Date.now() - pendingOlderThanMinutes * 60 * 1000).toISOString();
        const { data: pendingPosts, error: pendingError } = await supabaseClient
          .from('linkedin_posts')
          .select('id, processing_status, retry_count, created_at, author_name')
          .eq('processing_status', 'pending')
          .lt('created_at', pendingCutoffTime)
          .order('created_at', { ascending: false })
          .limit(20);

        if (pendingError) {
          console.error('Error getting pending posts:', pendingError);
        } else {
          console.log(`Found ${pendingPosts?.length || 0} pending posts older than ${pendingOlderThanMinutes} minutes:`);
          pendingPosts?.forEach(post => {
            console.log(`- ID: ${post.id}, Status: ${post.processing_status}, Created: ${post.created_at}, Author: ${post.author_name}`);
          });
        }
      }

      // 4. Check completed posts if includeCompleted is true
      if (includeCompleted) {
        const completedCutoffTime = new Date(Date.now() - completedOlderThanMinutes * 60 * 1000).toISOString();
        const { data: completedPosts, error: completedError } = await supabaseClient
          .from('linkedin_posts')
          .select('id, processing_status, retry_count, created_at, author_name, approach_message_error')
          .in('processing_status', ['completed', 'duplicate', 'not_job_posting', 'filtered_out'])
          .lt('created_at', completedCutoffTime)
          .order('created_at', { ascending: false })
          .limit(20);

        if (completedError) {
          console.error('Error getting completed posts:', completedError);
        } else {
          console.log(`Found ${completedPosts?.length || 0} completed posts older than ${completedOlderThanMinutes} minutes:`);
          completedPosts?.forEach(post => {
            console.log(`- ID: ${post.id}, Status: ${post.processing_status}, Created: ${post.created_at}, Author: ${post.author_name}, Has Error: ${!!post.approach_message_error}`);
          });
        }
      }

      const { data: recentPosts, error: recentError } = await supabaseClient
        .from('linkedin_posts')
        .select('id, processing_status, retry_count, created_at, author_name')
        .order('created_at', { ascending: false })
        .limit(20);

      if (recentError) {
        console.error('Error getting recent posts:', recentError);
      } else {
        console.log(`Recent 20 posts (any status):`);
        recentPosts?.forEach(post => {
          console.log(`- ID: ${post.id}, Status: ${post.processing_status}, Retry Count: ${post.retry_count || 0}, Created: ${post.created_at}, Author: ${post.author_name}`);
        });
      }

      // 5. Check cutoff time calculation
      const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString();
      console.log(`Cutoff time for retry (older than ${olderThanMinutes} minutes): ${cutoffTime}`);
      
      const statusesToCheck = ['error', 'retry_scheduled'];
      if (includePending) {
        statusesToCheck.push('pending');
      }
      if (includeCompleted) {
        statusesToCheck.push('completed', 'duplicate', 'not_job_posting', 'filtered_out');
      }

      const { data: oldEnoughPosts, error: oldEnoughError } = await supabaseClient
        .from('linkedin_posts')
        .select('id, processing_status, retry_count, created_at')
        .in('processing_status', statusesToCheck)
        .lt('created_at', cutoffTime);

      if (oldEnoughError) {
        console.error('Error getting old enough posts:', oldEnoughError);
      } else {
        console.log(`Posts old enough for retry (${oldEnoughPosts?.length || 0}):`);
        oldEnoughPosts?.forEach(post => {
          console.log(`- ID: ${post.id}, Status: ${post.processing_status}, Created: ${post.created_at}`);
        });
      }
    }

    // Original retry logic with completed status support
    let query = supabaseClient
      .from('linkedin_posts')
      .select('id, retry_count, created_at, processing_status, last_retry_at');

    // Determine which statuses to include
    const statusesToRetry = ['error', 'retry_scheduled'];
    if (includePending) {
      statusesToRetry.push('pending');
    }
    if (includeCompleted) {
      statusesToRetry.push('completed', 'duplicate', 'not_job_posting', 'filtered_out');
    }

    query = query.in('processing_status', statusesToRetry);

    // Filter by specific post IDs if provided
    if (postIds && Array.isArray(postIds)) {
      query = query.in('id', postIds);
      console.log(`Filtering by specific post IDs: ${postIds.join(', ')}`);
    } else {
      // Use different cutoff times for different types of posts
      if (includeCompleted || includePending) {
        // For completed posts, use the completedOlderThanMinutes parameter
        const completedCutoffTime = new Date(Date.now() - completedOlderThanMinutes * 60 * 1000).toISOString();
        const pendingCutoffTime = new Date(Date.now() - pendingOlderThanMinutes * 60 * 1000).toISOString();
        const errorCutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString();
        
        console.log(`Using completed cutoff time: ${completedCutoffTime}`);
        console.log(`Using pending cutoff time: ${pendingCutoffTime}`);
        console.log(`Using error cutoff time: ${errorCutoffTime}`);
        
        // We need to handle this with multiple queries since we have different time filters
        const { data: errorPosts } = await supabaseClient
          .from('linkedin_posts')
          .select('id, retry_count, created_at, processing_status, last_retry_at')
          .in('processing_status', ['error', 'retry_scheduled'])
          .lt('created_at', errorCutoffTime);

        let pendingPosts = [];
        if (includePending) {
          const { data } = await supabaseClient
            .from('linkedin_posts')
            .select('id, retry_count, created_at, processing_status, last_retry_at')
            .eq('processing_status', 'pending')
            .lt('created_at', pendingCutoffTime);
          pendingPosts = data || [];
        }

        let completedPosts = [];
        if (includeCompleted) {
          const { data } = await supabaseClient
            .from('linkedin_posts')
            .select('id, retry_count, created_at, processing_status, last_retry_at')
            .in('processing_status', ['completed', 'duplicate', 'not_job_posting', 'filtered_out'])
            .lt('created_at', completedCutoffTime);
          completedPosts = data || [];
        }

        const allPosts = [...(errorPosts || []), ...pendingPosts, ...completedPosts];
        
        // Sort by created_at
        allPosts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        // Apply the limit
        const limitedPosts = allPosts.slice(0, 50);
        
        return await processRetries(supabaseClient, limitedPosts, maxRetries, investigate, includeCompleted);
      } else {
        // Only retry posts that are older than the specified time to avoid immediate retries
        const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString();
        query = query.lt('created_at', cutoffTime);
        console.log(`Using cutoff time: ${cutoffTime}`);
      }
    }

    const { data: postsToRetry, error: fetchError } = await query
      .order('created_at', { ascending: true })
      .limit(50); // Limit to 50 posts per batch to avoid overwhelming the system

    if (fetchError) {
      console.error('Error fetching posts to retry:', fetchError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch posts' 
      }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return await processRetries(supabaseClient, postsToRetry || [], maxRetries, investigate, includeCompleted);

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

async function processRetries(supabaseClient: any, postsToRetry: any[], maxRetries: number, investigate: boolean, includeCompleted: boolean = false) {
  if (!postsToRetry || postsToRetry.length === 0) {
    console.log('No posts found to retry');
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'No posts found to retry',
      retriedCount: 0,
      investigation: investigate ? 'Check console logs for detailed investigation' : 'Investigation disabled'
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  console.log(`Found ${postsToRetry.length} posts to retry`);

  // Filter posts that haven't exceeded max retries (or allow completed posts if includeCompleted is true)
  const eligiblePosts = postsToRetry.filter(post => {
    if (post.processing_status === 'pending') {
      return true; // Always retry pending posts
    }
    if (includeCompleted && ['completed', 'duplicate', 'not_job_posting', 'filtered_out'].includes(post.processing_status)) {
      return true; // Allow retrying completed posts when includeCompleted is true
    }
    return (post.retry_count || 0) < maxRetries;
  });
  
  console.log(`${eligiblePosts.length} posts are eligible for retry`);

  let retriedCount = 0;
  let errors = [];

  // Process retries with a small delay between each to avoid overwhelming the system
  for (const post of eligiblePosts) {
    try {
      const isCompletedRetry = ['completed', 'duplicate', 'not_job_posting', 'filtered_out'].includes(post.processing_status);
      const retryAttempt = post.processing_status === 'pending' ? 1 : (post.retry_count || 0) + 1;
      
      console.log(`Retrying post ${post.id} (attempt ${retryAttempt})${isCompletedRetry ? ' [COMPLETED POST RETRY]' : ''}`);
      
      // Reset the post status to pending before retrying if it was completed
      if (isCompletedRetry) {
        await supabaseClient
          .from('linkedin_posts')
          .update({ 
            processing_status: 'pending',
            retry_count: 0,
            approach_message_error: null,
            approach_message_generated: false
          })
          .eq('id', post.id);
        
        console.log(`Reset post ${post.id} status to pending for retry`);
      }
      
      const { error: retryError } = await supabaseClient.functions.invoke('process-linkedin-post', {
        body: { postId: post.id, isRetry: !isCompletedRetry }
      });

      if (retryError) {
        console.error(`Error retrying post ${post.id}:`, retryError);
        errors.push({ postId: post.id, error: retryError.message });
      } else {
        retriedCount++;
        console.log(`Successfully triggered retry for post ${post.id}`);
      }

      // Small delay between retries to avoid overwhelming the system
      if (eligiblePosts.indexOf(post) < eligiblePosts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }

    } catch (error) {
      console.error(`Exception retrying post ${post.id}:`, error);
      errors.push({ postId: post.id, error: error.message });
    }
  }

  // Mark posts that have exceeded max retries as permanently failed (excluding pending and completed)
  const exceededRetryPosts = postsToRetry.filter(post => 
    !['pending', 'completed', 'duplicate', 'not_job_posting', 'filtered_out'].includes(post.processing_status) && 
    (post.retry_count || 0) >= maxRetries
  );
  
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
    totalFound: postsToRetry.length,
    eligibleForRetry: eligiblePosts.length,
    permanentlyFailed: exceededRetryPosts.length,
    errors: errors,
    investigation: investigate ? 'Check console logs for detailed investigation' : 'Investigation disabled',
    includeCompleted: includeCompleted
  }), { 
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

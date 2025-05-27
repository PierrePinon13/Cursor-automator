

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
    const { postIds = null, maxRetries = 3, olderThanMinutes = 30, investigate = true } = await req.json()

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

      // 3. Check recent posts regardless of status
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

      // 4. Check cutoff time calculation
      const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString();
      console.log(`Cutoff time for retry (older than ${olderThanMinutes} minutes): ${cutoffTime}`);
      
      const { data: oldEnoughPosts, error: oldEnoughError } = await supabaseClient
        .from('linkedin_posts')
        .select('id, processing_status, retry_count, created_at')
        .in('processing_status', ['error', 'retry_scheduled'])
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

    // Original retry logic
    let query = supabaseClient
      .from('linkedin_posts')
      .select('id, retry_count, created_at, processing_status, last_retry_at')
      .in('processing_status', ['error', 'retry_scheduled'])

    // Filter by specific post IDs if provided
    if (postIds && Array.isArray(postIds)) {
      query = query.in('id', postIds);
      console.log(`Filtering by specific post IDs: ${postIds.join(', ')}`);
    } else {
      // Only retry posts that are older than the specified time to avoid immediate retries
      const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString();
      query = query.lt('created_at', cutoffTime);
      console.log(`Using cutoff time: ${cutoffTime}`);
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
        retriedCount: 0,
        investigation: investigate ? 'Check console logs for detailed investigation' : 'Investigation disabled'
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
      errors: errors,
      investigation: investigate ? 'Check console logs for detailed investigation' : 'Investigation disabled'
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



import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LinkedInPost {
  title: string;
  text: string;
  parsed_datetime: string;
  urn: string;
  author: {
    id: string;
    name: string;
    public_identifier: string;
    headline: string;
    is_company: boolean;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔔 N8N LinkedIn Posts Callback received')
    
    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse the incoming request
    const posts: LinkedInPost[] = await req.json()
    
    if (!Array.isArray(posts) || posts.length === 0) {
      console.error('❌ No posts provided or invalid format')
      return new Response('No posts provided or invalid format', { 
        status: 400,
        headers: corsHeaders 
      })
    }

    console.log(`📥 Processing ${posts.length} LinkedIn posts`)

    let processedCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    // Process each post
    for (const post of posts) {
      try {
        // Check if post already exists (deduplicate by URN)
        const { data: existingPost } = await supabaseClient
          .from('linkedin_posts_raw')
          .select('id')
          .eq('urn', post.urn)
          .single();

        if (existingPost) {
          console.log(`⚠️ Post ${post.urn} already exists, skipping`);
          duplicateCount++;
          continue;
        }

        // Prepare the post data for insertion
        const postData = {
          urn: post.urn,
          title: post.title || null,
          text: post.text || null,
          url: `https://www.linkedin.com/feed/update/${post.urn.split(':').pop()}`,
          posted_at_iso: post.parsed_datetime,
          posted_at_timestamp: new Date(post.parsed_datetime).getTime(),
          author_type: post.author.is_company ? 'company' : 'person',
          author_name: post.author.name,
          author_headline: post.author.headline,
          author_profile_id: post.author.id,
          author_profile_url: `https://www.linkedin.com/in/${post.author.public_identifier}`,
          is_repost: false,
          processed: false,
          apify_dataset_id: 'n8n_callback',
          raw_data: post
        };

        // Insert into linkedin_posts_raw
        const { error: insertError } = await supabaseClient
          .from('linkedin_posts_raw')
          .insert(postData);

        if (insertError) {
          console.error(`❌ Error inserting post ${post.urn}:`, insertError);
          errorCount++;
          continue;
        }

        console.log(`✅ Post ${post.urn} inserted successfully`);
        processedCount++;

      } catch (error) {
        console.error(`❌ Error processing post ${post.urn}:`, error);
        errorCount++;
      }
    }

    console.log(`📊 Processing complete: ${processedCount} processed, ${duplicateCount} duplicates, ${errorCount} errors`);

    // If we have new posts, trigger the processing pipeline
    if (processedCount > 0) {
      console.log('🚀 Triggering processing pipeline...');
      
      try {
        // Call the process-dataset function to start the processing pipeline
        const { error: processError } = await supabaseClient.functions.invoke('process-dataset', {
          body: { 
            datasetId: 'n8n_callback',
            source: 'n8n_linkedin_callback'
          }
        });

        if (processError) {
          console.error('❌ Error triggering process-dataset:', processError);
        } else {
          console.log('✅ Processing pipeline triggered successfully');
        }
      } catch (triggerError) {
        console.error('❌ Error triggering processing pipeline:', triggerError);
      }
    }

    const response = {
      success: true,
      message: `Processed ${processedCount} new posts`,
      stats: {
        total_received: posts.length,
        processed: processedCount,
        duplicates: duplicateCount,
        errors: errorCount
      }
    };

    return new Response(JSON.stringify(response), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('💥 Error in n8n-linkedin-posts-callback function:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error'
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

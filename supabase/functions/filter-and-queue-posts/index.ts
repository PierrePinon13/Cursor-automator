
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Filter and Queue Posts - Starting batch processing');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { dataset_id, batch_size = 100 } = await req.json();
    
    console.log(`📊 Processing dataset: ${dataset_id} with batch size: ${batch_size}`);

    // Étape 1: Récupérer les posts raw non traités
    const { data: rawPosts, error: fetchError } = await supabaseClient
      .from('linkedin_posts_raw')
      .select('*')
      .eq('apify_dataset_id', dataset_id)
      .is('processed', null)
      .limit(batch_size);

    if (fetchError) {
      throw new Error(`Failed to fetch raw posts: ${fetchError.message}`);
    }

    if (!rawPosts || rawPosts.length === 0) {
      console.log('✅ No more raw posts to process');
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No more posts to process',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📥 Found ${rawPosts.length} raw posts to filter and queue`);

    // Étape 2: Filtrer les posts (éliminer les reposts, author_type != Person, vérifier les champs requis)
    const filteredPosts = rawPosts.filter(post => {
      // Éliminer les reposts
      if (post.is_repost) return false;
      
      // Ne garder que les posts de personnes (pas d'entreprises)
      if (post.author_type !== 'Person') return false;
      
      // Vérifier les champs requis
      if (!post.text || !post.author_name || !post.author_profile_id) return false;
      
      return true;
    });

    console.log(`✂️ Filtered from ${rawPosts.length} to ${filteredPosts.length} posts`);

    if (filteredPosts.length === 0) {
      // Marquer tous les posts raw comme traités même s'ils sont filtrés
      await supabaseClient
        .from('linkedin_posts_raw')
        .update({ processed: true })
        .in('id', rawPosts.map(p => p.id));

      return new Response(JSON.stringify({ 
        success: true,
        message: 'All posts filtered out',
        processed: rawPosts.length,
        queued: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Étape 3: Vérifier les doublons dans linkedin_posts
    const existingUrls = filteredPosts.map(p => p.url);
    const { data: existingPosts } = await supabaseClient
      .from('linkedin_posts')
      .select('url')
      .in('url', existingUrls);

    const existingUrlSet = new Set(existingPosts?.map(p => p.url) || []);
    const newPosts = filteredPosts.filter(post => !existingUrlSet.has(post.url));

    console.log(`🔄 After deduplication: ${newPosts.length} new posts to insert`);

    let insertedCount = 0;
    if (newPosts.length > 0) {
      // Étape 4: Insérer dans linkedin_posts avec status 'queued_step1'
      const postsToInsert = newPosts.map(post => ({
        apify_dataset_id: post.apify_dataset_id,
        urn: post.urn,
        text: post.text,
        title: post.title,
        url: post.url,
        posted_at_iso: post.posted_at_iso,
        posted_at_timestamp: post.posted_at_timestamp,
        author_type: post.author_type,
        author_profile_url: post.author_profile_url,
        author_profile_id: post.author_profile_id,
        author_name: post.author_name,
        author_headline: post.author_headline,
        raw_data: post.raw_data,
        processing_status: 'queued_step1'
      }));

      const { error: insertError } = await supabaseClient
        .from('linkedin_posts')
        .insert(postsToInsert);

      if (insertError) {
        throw new Error(`Failed to insert posts: ${insertError.message}`);
      }

      insertedCount = postsToInsert.length;
      console.log(`✅ Inserted ${insertedCount} new posts with status 'queued_step1'`);
    }

    // Étape 5: Marquer tous les posts raw comme traités
    await supabaseClient
      .from('linkedin_posts_raw')
      .update({ processed: true })
      .in('id', rawPosts.map(p => p.id));

    // Étape 6: Déclencher le traitement OpenAI Step 1 si on a de nouveaux posts
    if (insertedCount > 0) {
      console.log('🚀 Triggering OpenAI Step 1 batch processing...');
      
      const { error: triggerError } = await supabaseClient.functions.invoke('openai-step1-batch-worker', {
        body: { 
          dataset_id,
          batch_size: Math.min(insertedCount, 50) // Limiter la taille des batches OpenAI
        }
      });

      if (triggerError) {
        console.error('⚠️ Failed to trigger OpenAI Step 1:', triggerError);
      } else {
        console.log('✅ OpenAI Step 1 batch triggered successfully');
      }
    }

    const result = {
      success: true,
      dataset_id,
      raw_posts_processed: rawPosts.length,
      posts_filtered: rawPosts.length - filteredPosts.length,
      posts_duplicates: filteredPosts.length - newPosts.length,
      posts_queued: insertedCount,
      next_step_triggered: insertedCount > 0
    };

    console.log('📊 Filter and Queue completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in filter-and-queue-posts:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

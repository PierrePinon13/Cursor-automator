
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
    console.log('🔍 Unipile Batch Worker - Starting');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { dataset_id, batch_size = 30 } = await req.json();
    
    console.log(`🎯 Processing Unipile batch for dataset: ${dataset_id}`);

    // Récupérer les posts validés pour Unipile
    const { data: posts, error: fetchError } = await supabaseClient
      .from('linkedin_posts')
      .select('*')
      .eq('processing_status', 'queued_unipile')
      .eq('apify_dataset_id', dataset_id)
      .limit(batch_size);

    if (fetchError) {
      throw new Error(`Failed to fetch posts: ${fetchError.message}`);
    }

    if (!posts || posts.length === 0) {
      console.log('✅ No posts queued for Unipile');
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No posts to process',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📥 Processing ${posts.length} posts for Unipile scraping`);

    // Récupérer un compte Unipile disponible
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('unipile_account_id')
      .not('unipile_account_id', 'is', null)
      .limit(1);

    if (!profiles || profiles.length === 0) {
      throw new Error('No Unipile account available');
    }

    const accountId = profiles[0].unipile_account_id;
    console.log(`🔗 Using Unipile account: ${accountId}`);

    // Marquer les posts comme en traitement
    await supabaseClient
      .from('linkedin_posts')
      .update({ processing_status: 'processing_unipile' })
      .in('id', posts.map(p => p.id));

    const results = {
      processed: 0,
      passed: 0,
      failed: 0,
      errors: []
    };

    const processedPostIds = [];

    // Traitement séquentiel utilisant unipile-queue pour la gestion du rate limiting
    for (const post of posts) {
      try {
        console.log(`🔍 Processing Unipile for post: ${post.id}`);
        
        // Appel à unipile-queue avec l'opération scrape_profile
        const { data: unipileResult, error: unipileError } = await supabaseClient.functions.invoke('unipile-queue', {
          body: {
            action: 'execute',
            account_id: accountId,
            operation: 'scrape_profile',
            payload: {
              profileUrl: post.author_profile_url
            },
            priority: false
          }
        });

        if (unipileError || !unipileResult?.success) {
          throw new Error(`Unipile queue error: ${unipileError?.message || unipileResult?.error}`);
        }

        const profileData = unipileResult.result;
        
        // Extraire les informations importantes du profil
        const currentExperience = profileData.experience?.[0];
        const companyName = currentExperience?.company?.name;
        const position = currentExperience?.title;
        const companyLinkedInId = currentExperience?.company?.linkedin_id;

        // Sauvegarder les résultats
        await supabaseClient
          .from('linkedin_posts')
          .update({
            unipile_profile_scraped: true,
            unipile_profile_scraped_at: new Date().toISOString(),
            unipile_company: companyName,
            unipile_position: position,
            unipile_company_linkedin_id: companyLinkedInId,
            unipile_response: profileData,
            processing_status: 'queued_lead_creation',
            last_updated_at: new Date().toISOString()
          })
          .eq('id', post.id);

        results.processed++;
        results.passed++;
        processedPostIds.push(post.id);

        console.log(`✅ Unipile completed for post: ${post.id} - ${companyName}`);

        // Note: unipile-queue gère déjà les délais entre les requêtes
        
      } catch (error) {
        console.error(`❌ Unipile failed for post ${post.id}:`, error);
        
        await supabaseClient
          .from('linkedin_posts')
          .update({
            processing_status: 'error_unipile',
            retry_count: (post.retry_count || 0) + 1,
            last_retry_at: new Date().toISOString()
          })
          .eq('id', post.id);

        results.failed++;
        results.errors.push({ post_id: post.id, error: error.message });
      }
    }

    // Déclencher la création de leads si on a des posts traités
    if (processedPostIds.length > 0) {
      console.log(`🚀 Triggering Lead Creation for ${processedPostIds.length} processed posts...`);
      
      const { error: triggerError } = await supabaseClient.functions.invoke('lead-creation-batch-worker', {
        body: { 
          dataset_id,
          batch_size: Math.min(processedPostIds.length, 50)
        }
      });

      if (triggerError) {
        console.error('⚠️ Failed to trigger Lead Creation:', triggerError);
      } else {
        console.log('✅ Lead Creation batch triggered successfully');
      }
    }

    const finalResult = {
      success: true,
      dataset_id,
      batch_size: posts.length,
      ...results,
      lead_creation_triggered: processedPostIds.length > 0
    };

    console.log('📊 Unipile Batch completed:', finalResult);

    return new Response(JSON.stringify(finalResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in unipile-batch-worker:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

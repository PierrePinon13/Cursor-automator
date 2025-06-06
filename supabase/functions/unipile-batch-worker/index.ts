
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

    // Récupérer les posts en attente pour Unipile
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

    // Récupérer tous les comptes Unipile disponibles pour la rotation
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('unipile_account_id')
      .not('unipile_account_id', 'is', null);

    if (profilesError || !profiles || profiles.length === 0) {
      throw new Error('No Unipile accounts available');
    }

    const accountIds = profiles.map(p => p.unipile_account_id);
    console.log(`🔗 Found ${accountIds.length} Unipile accounts for rotation: ${accountIds.join(', ')}`);

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

    // Traitement séquentiel avec rotation des comptes
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      // Rotation des comptes : utiliser un compte différent pour chaque post
      const accountId = accountIds[i % accountIds.length];
      
      try {
        console.log(`🔍 Processing Unipile for post: ${post.id} with account: ${accountId}`);
        
        // Utiliser author_profile_id au lieu de author_profile_url
        if (!post.author_profile_id) {
          throw new Error(`Missing author_profile_id for post ${post.id}`);
        }
        
        // Appel à unipile-queue avec l'opération scrape_profile
        const { data: unipileResult, error: unipileError } = await supabaseClient.functions.invoke('unipile-queue', {
          body: {
            action: 'execute',
            account_id: accountId,
            operation: 'scrape_profile',
            payload: {
              authorProfileId: post.author_profile_id
            },
            priority: false
          }
        });

        if (unipileError || !unipileResult?.success) {
          throw new Error(`Unipile queue error: ${unipileError?.message || unipileResult?.error}`);
        }

        const profileData = unipileResult.result;
        
        // Extraire les informations importantes du profil
        const currentExperience = profileData.work_experience?.[0];
        const companyName = currentExperience?.company;
        const position = currentExperience?.position;
        const companyLinkedInId = currentExperience?.company_id;

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

        console.log(`✅ Unipile completed for post: ${post.id} - ${companyName} (account: ${accountId})`);

        // Note: unipile-queue gère déjà les délais entre les requêtes pour chaque compte
        
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
      accounts_used: accountIds.length,
      account_rotation: true,
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


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
    console.log('🏢 Specialized Company Worker started');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { post_id, dataset_id, batch_mode = false, unipile_result, workflow_trigger = false } = await req.json();

    if (batch_mode) {
      return await processBatchCompanies(supabaseClient, dataset_id);
    } else if (post_id) {
      return await processSingleCompany(supabaseClient, post_id, dataset_id, unipile_result, workflow_trigger);
    } else {
      throw new Error('Either post_id or batch_mode must be provided');
    }

  } catch (error) {
    console.error('❌ Error in specialized-company-worker:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processSingleCompany(supabaseClient: any, postId: string, datasetId?: string, unipileResult?: any, workflowTrigger = false) {
  console.log(`🏢 Processing company verification for post: ${postId}, dataset: ${datasetId}`);
  
  try {
    // Récupérer les données du post
    const { data: post, error: postError } = await supabaseClient
      .from('linkedin_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      throw new Error(`Post not found: ${postId}`);
    }

    const companyLinkedInId = post.unipile_company_linkedin_id;
    
    if (!companyLinkedInId) {
      console.log(`⚠️ No company LinkedIn ID found for post ${postId}, skipping company verification`);
      
      // Déclencher l'étape suivante si c'est un workflow (simplifié)
      if (workflowTrigger) {
        try {
          await supabaseClient.functions.invoke('specialized-lead-worker', {
            body: { 
              post_id: postId,
              dataset_id: datasetId,
              workflow_trigger: true
            }
          });
          console.log(`✅ Lead creation triggered for post: ${postId}`);
        } catch (error) {
          console.error(`❌ Error triggering lead creation for post ${postId}:`, error);
        }
      }
      
      return new Response(JSON.stringify({
        success: true,
        action: 'skipped',
        reason: 'No company LinkedIn ID',
        post_id: postId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Étape 9: Vérifier si l'entreprise existe déjà en base
    const { data: existingCompany, error: checkError } = await supabaseClient
      .from('companies')
      .select('*')
      .eq('linkedin_id', companyLinkedInId)
      .single();

    let companyData = existingCompany;
    let action = 'found_existing';

    // Étape 10: Si l'entreprise n'existe pas ou manque de détails, la scraper
    if (!existingCompany || !existingCompany.description || !existingCompany.company_size) {
      console.log(`🔍 Company ${companyLinkedInId} needs scraping for post ${postId}`);
      
      try {
        // Appeler le fetch-company-info pour récupérer les détails
        const { data: companyResult, error: companyError } = await supabaseClient.functions.invoke('fetch-company-info', {
          body: { companyLinkedInId }
        });

        if (companyError || !companyResult?.success) {
          console.error(`❌ Error fetching company info for ${companyLinkedInId}:`, companyError || companyResult?.error);
          action = 'scraping_failed';
        } else {
          companyData = companyResult.company;
          action = existingCompany ? 'updated' : 'created';
          console.log(`✅ Company ${companyLinkedInId} successfully ${action}`);
        }
      } catch (error) {
        console.error(`❌ Error during company scraping for ${companyLinkedInId}:`, error);
        action = 'scraping_failed';
      }
    }

    // Mettre à jour le post avec les informations de l'entreprise
    await supabaseClient
      .from('linkedin_posts')
      .update({
        company_verified_at: new Date().toISOString(),
        company_scraping_status: action,
        last_updated_at: new Date().toISOString()
      })
      .eq('id', postId);

    console.log(`✅ Company verification completed for post ${postId}: ${action}`);

    // Déclencher l'étape suivante si c'est un workflow (simplifié)
    if (workflowTrigger) {
      try {
        await supabaseClient.functions.invoke('specialized-lead-worker', {
          body: { 
            post_id: postId,
            dataset_id: datasetId,
            workflow_trigger: true
          }
        });
        console.log(`✅ Lead creation triggered for post: ${postId}`);
      } catch (error) {
        console.error(`❌ Error triggering lead creation for post ${postId}:`, error);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      action: action,
      company_data: companyData,
      post_id: postId,
      dataset_id: datasetId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(`❌ Error processing company for post ${postId}:`, error);
    
    await supabaseClient
      .from('linkedin_posts')
      .update({
        company_scraping_status: 'error',
        retry_count: supabaseClient.rpc('increment', { x: 1 }),
        last_retry_at: new Date().toISOString(),
        last_updated_at: new Date().toISOString()
      })
      .eq('id', postId);

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      post_id: postId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function processBatchCompanies(supabaseClient: any, datasetId?: string) {
  console.log(`🏢 Processing batch company verification for dataset: ${datasetId}`);
  
  let query = supabaseClient
    .from('linkedin_posts')
    .select('*')
    .eq('unipile_profile_scraped', true)
    .not('unipile_company_linkedin_id', 'is', null)
    .is('company_verified_at', null)
    .limit(50);

  if (datasetId) {
    query = query.eq('apify_dataset_id', datasetId);
  }

  const { data: posts, error } = await query;

  if (error) {
    throw new Error(`Error fetching posts for company verification: ${error.message}`);
  }

  console.log(`📊 Found ${posts.length} posts needing company verification`);

  let processed = 0;
  let errors = 0;

  // Traiter en parallèle avec limite
  const PARALLEL_LIMIT = 3;
  
  for (let i = 0; i < posts.length; i += PARALLEL_LIMIT) {
    const batch = posts.slice(i, i + PARALLEL_LIMIT);
    
    await Promise.all(batch.map(async (post) => {
      try {
        await processSingleCompany(supabaseClient, post.id, post.apify_dataset_id, null, false);
        processed++;
      } catch (error) {
        console.error(`❌ Error processing company for post ${post.id}:`, error);
        errors++;
      }
    }));
    
    // Petit délai entre les batches
    if (i + PARALLEL_LIMIT < posts.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return new Response(JSON.stringify({
    success: true,
    batch_mode: true,
    dataset_id: datasetId,
    processed_count: processed,
    error_count: errors,
    total_found: posts.length
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

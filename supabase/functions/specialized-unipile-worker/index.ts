
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getAvailableUnipileAccount, applyRateLimit, scrapeCompanyInfo } from './multi-account-manager.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      post_id, 
      post_ids, 
      dataset_id, 
      batch_mode = false 
    } = await req.json();

    const cleanDatasetId = dataset_id && dataset_id !== 'null' && dataset_id !== null ? dataset_id : null;

    // Mode batch
    if (batch_mode && post_ids && Array.isArray(post_ids) && post_ids.length > 0) {
      console.log(`🔍 Processing Unipile BATCH: ${post_ids.length} posts`);
      
      const validPostIds = post_ids.filter(id => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return id && typeof id === 'string' && uuidRegex.test(id);
      });

      if (validPostIds.length === 0) {
        throw new Error('No valid post IDs provided');
      }

      const { data: posts, error: fetchError } = await supabaseClient
        .from('linkedin_posts')
        .select('*')
        .in('id', validPostIds);

      if (fetchError || !posts) {
        throw new Error(`Failed to fetch posts: ${fetchError?.message}`);
      }

      let successCount = 0;
      let errorCount = 0;
      const CONCURRENT_LIMIT = 2; // Réduit pour respecter rate limiting
      
      for (let i = 0; i < posts.length; i += CONCURRENT_LIMIT) {
        const batch = posts.slice(i, i + CONCURRENT_LIMIT);
        
        const promises = batch.map(async (post) => {
          try {
            await processSinglePost(post, supabaseClient, cleanDatasetId);
            successCount++;
          } catch (error) {
            console.error(`❌ Unipile failed for post ${post.id}:`, error);
            errorCount++;
          }
        });

        await Promise.allSettled(promises);
        
        if (i + CONCURRENT_LIMIT < posts.length) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Délai entre batches
        }
      }

      return new Response(JSON.stringify({ 
        success: true,
        processed_count: posts.length,
        success_count: successCount,
        error_count: errorCount,
        step: 'unipile'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Mode single post
    if (post_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!post_id || typeof post_id !== 'string' || !uuidRegex.test(post_id)) {
        throw new Error(`Invalid post ID format: ${post_id}`);
      }
      
      const { data: post, error: fetchError } = await supabaseClient
        .from('linkedin_posts')
        .select('*')
        .eq('id', post_id)
        .single();

      if (fetchError || !post) {
        throw new Error(`Failed to fetch post: ${fetchError?.message}`);
      }

      const result = await processSinglePost(post, supabaseClient, cleanDatasetId);

      return new Response(JSON.stringify({ 
        success: true,
        processed_count: 1,
        success_count: 1,
        error_count: 0,
        step: 'unipile',
        result: result
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    throw new Error('Either post_id or post_ids must be provided');

  } catch (error) {
    console.error('❌ Error in specialized-unipile-worker:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processSinglePost(post: any, supabaseClient: any, datasetId?: string) {
  console.log(`🔍 Processing Unipile for post: ${post.id}`);
  
  if (!post.author_profile_id) {
    console.log(`⚠️ No author_profile_id for post ${post.id}, skipping Unipile`);
    return { post_id: post.id, success: false, error: 'No author_profile_id' };
  }

  try {
    // Récupérer un compte Unipile disponible avec rotation
    const accountId = await getAvailableUnipileAccount(supabaseClient);
    if (!accountId) {
      throw new Error('No Unipile account available');
    }

    console.log(`🔑 Using Unipile account: ${accountId}`);

    // Appliquer le rate limiting
    await applyRateLimit(accountId);

    // Appeler unipile-queue pour le scraping de profil
    const { data: scrapeResult, error: scrapeError } = await supabaseClient.functions.invoke('unipile-queue', {
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

    if (scrapeError || !scrapeResult?.success) {
      throw new Error(`Unipile scraping failed: ${scrapeError?.message || scrapeResult?.error}`);
    }

    // Extraire les données pertinentes
    const unipileData = scrapeResult.result;
    const extractedData = extractProfileData(unipileData);

    // Mettre à jour le post avec les résultats
    const updateData = {
      unipile_profile_scraped: true,
      unipile_profile_scraped_at: new Date().toISOString(),
      unipile_response: unipileData,
      unipile_company: extractedData.company,
      unipile_position: extractedData.position,
      unipile_company_linkedin_id: extractedData.company_id,
      last_updated_at: new Date().toISOString()
    };

    if (extractedData.phone) {
      updateData.phone_number = extractedData.phone;
      updateData.phone_retrieved_at = new Date().toISOString();
    }

    await supabaseClient
      .from('linkedin_posts')
      .update(updateData)
      .eq('id', post.id);

    console.log(`✅ Unipile completed for post: ${post.id}`);

    // 🆕 Scraper les informations de l'entreprise si on a un LinkedIn ID
    if (extractedData.company_id) {
      try {
        console.log(`🏢 Scraping company info for LinkedIn ID: ${extractedData.company_id}`);
        const companyData = await scrapeCompanyInfo(supabaseClient, accountId, extractedData.company_id);
        
        // Sauvegarder les données d'entreprise
        await supabaseClient
          .from('linkedin_posts')
          .update({
            company_info_scraped: true,
            company_info_scraped_at: new Date().toISOString(),
            company_data: companyData,
            last_updated_at: new Date().toISOString()
          })
          .eq('id', post.id);
        
        console.log(`✅ Company info scraped for post: ${post.id}`);
      } catch (companyError) {
        console.error(`❌ Company scraping failed for post ${post.id}:`, companyError);
        // Ne pas faire échouer le processus principal si le scraping entreprise échoue
      }
    }

    // 🔥 Déclenchement immédiat des workers suivants
    console.log(`🚀 Triggering company verification and lead creation for post ${post.id}`);
    
    // Déclencher la vérification d'entreprise
    try {
      await supabaseClient.functions.invoke('specialized-company-worker', {
        body: { 
          post_id: post.id,
          dataset_id: datasetId || null,
          workflow_trigger: true
        }
      });
      console.log(`🏢 Company verification triggered for post ${post.id}`);
    } catch (error) {
      console.error(`❌ Error triggering company verification for post ${post.id}:`, error);
    }

    // Déclencher la création de lead
    try {
      await supabaseClient.functions.invoke('specialized-lead-worker', {
        body: { 
          post_id: post.id,
          dataset_id: datasetId || null,
          workflow_trigger: true
        }
      });
      console.log(`👤 Lead creation triggered for post ${post.id}`);
    } catch (error) {
      console.error(`❌ Error triggering lead creation for post ${post.id}:`, error);
    }

    return { 
      post_id: post.id, 
      success: true, 
      company: extractedData.company,
      position: extractedData.position,
      phone: extractedData.phone ? 'Found' : 'Not found'
    };

  } catch (error) {
    console.error(`❌ Unipile error for post ${post.id}:`, error);
    
    // Marquer comme erreur
    await supabaseClient
      .from('linkedin_posts')
      .update({ 
        unipile_profile_scraped: false,
        processing_status: 'error',
        last_updated_at: new Date().toISOString()
      })
      .eq('id', post.id);

    throw error;
  }
}

function extractProfileData(unipileData: any) {
  let company = null;
  let position = null;
  let company_id = null;
  
  // Extraire les informations depuis l'expérience
  const experiences = unipileData.work_experience || unipileData.linkedin_profile?.experience || [];
  
  if (experiences.length > 0) {
    // Trouver l'expérience actuelle
    const currentExperience = experiences.find((exp: any) => 
      !exp.end || exp.end === null || exp.end === ''
    ) || experiences[0];

    if (currentExperience) {
      company = currentExperience.company || currentExperience.companyName || null;
      position = currentExperience.position || currentExperience.title || null;
      company_id = currentExperience.company_id || currentExperience.companyId || null;
    }
  }

  const phone = unipileData.phone_numbers?.[0] || unipileData.phone;

  return { company, position, company_id, phone };
}

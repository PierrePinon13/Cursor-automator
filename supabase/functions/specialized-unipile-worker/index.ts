
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
    console.log('🔍 Specialized Unipile Worker started');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      post_id, 
      post_ids, 
      dataset_id, 
      batch_mode = false,
      workflow_trigger = false 
    } = await req.json();

    // Mode batch
    if (batch_mode && post_ids && Array.isArray(post_ids) && post_ids.length > 0) {
      console.log(`🎯 Processing Unipile BATCH: ${post_ids.length} posts (dataset: ${dataset_id})`);
      
      const { data: posts, error: fetchError } = await supabaseClient
        .from('linkedin_posts')
        .select('*')
        .in('id', post_ids);

      if (fetchError || !posts) {
        throw new Error(`Failed to fetch posts for batch: ${fetchError?.message}`);
      }

      let successCount = 0;
      let errorCount = 0;
      
      // Traitement séquentiel pour respecter les délais de rate limiting
      for (const post of posts) {
        try {
          await processSinglePost(post, supabaseClient, dataset_id);
          successCount++;
          
          // Délai entre chaque post pour éviter la surcharge
          if (posts.indexOf(post) < posts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(`❌ Unipile failed for post ${post.id}:`, error);
          errorCount++;
          await handleUnipileError(supabaseClient, post.id, error);
        }
      }

      return new Response(JSON.stringify({ 
        success: true,
        batch_mode: true,
        processed_count: posts.length,
        success_count: successCount,
        error_count: errorCount,
        dataset_id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Mode single post
    if (!post_id) {
      throw new Error('Post ID is required for single post mode');
    }

    console.log(`🎯 Processing Unipile for post: ${post_id} (dataset: ${dataset_id})`);

    const { data: post, error: fetchError } = await supabaseClient
      .from('linkedin_posts')
      .select('*')
      .eq('id', post_id)
      .single();

    if (fetchError || !post) {
      throw new Error(`Post not found: ${post_id}`);
    }

    const result = await processSinglePost(post, supabaseClient, dataset_id);

    return new Response(JSON.stringify({ 
      success: true,
      post_id,
      result,
      dataset_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in specialized-unipile-worker:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processSinglePost(post: any, supabaseClient: any, datasetId?: string) {
  console.log(`🔍 Processing Unipile for post: ${post.id}`);
  
  // 1. Récupérer un compte Unipile disponible avec rotation
  const accountId = await getAvailableUnipileAccount(supabaseClient);
  if (!accountId) {
    throw new Error('No Unipile account available');
  }
  
  console.log(`🔑 Using Unipile account: ${accountId}`);
  
  try {
    // 2. Scraper le profil de l'auteur via unipile-queue
    console.log(`👤 Scraping profile for author: ${post.author_name}`);
    
    // Appliquer le rate limiting avant l'appel
    await applyRateLimit(accountId);
    
    const { data: profileResult, error: profileError } = await supabaseClient.functions.invoke('unipile-queue', {
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

    if (profileError || !profileResult?.success) {
      throw new Error(`Profile scraping failed: ${profileError?.message || profileResult?.error}`);
    }

    const profileData = profileResult.result;
    console.log(`✅ Profile scraped successfully for ${post.author_name}`);

    // 3. Extraire et nettoyer les données du profil
    const cleanedData = {
      author_headline: profileData.headline || null,
      unipile_position: profileData.position || null,
      unipile_company: profileData.company || null,
      unipile_location: profileData.location || null,
      unipile_profile_data: profileData
    };

    // 4. Enrichir les informations de l'entreprise si disponible
    let companyData = null;
    let companyId = null;
    
    if (profileData.company && profileData.companyLinkedInId) {
      try {
        console.log(`🏢 Enriching company info for: ${profileData.company}`);
        
        // Vérifier si l'entreprise existe déjà
        const { data: existingCompany } = await supabaseClient
          .from('companies')
          .select('id')
          .eq('linkedin_id', profileData.companyLinkedInId)
          .single();

        if (existingCompany) {
          companyId = existingCompany.id;
          console.log(`ℹ️ Company already exists with ID: ${companyId}`);
        } else {
          // Scraper les infos de l'entreprise
          companyData = await scrapeCompanyInfo(supabaseClient, accountId, profileData.companyLinkedInId);
          
          // Créer l'entrée entreprise
          const { data: newCompany, error: companyError } = await supabaseClient
            .from('companies')
            .insert({
              name: companyData.name || profileData.company,
              linkedin_id: profileData.companyLinkedInId,
              description: companyData.description,
              industry: companyData.industry,
              company_size: companyData.employeeCount,
              headquarters: companyData.headquarters,
              website: companyData.website,
              follower_count: companyData.followerCount,
              specialties: companyData.specialties
            })
            .select('id')
            .single();

          if (!companyError && newCompany) {
            companyId = newCompany.id;
            console.log(`✅ Company created with ID: ${companyId}`);
          }
        }
      } catch (companyError) {
        console.warn(`⚠️ Company enrichment failed for ${profileData.company}:`, companyError);
        // Continue sans bloquer le traitement du lead
      }
    }

    // 5. Mettre à jour le post avec les données enrichies
    const updateData = {
      ...cleanedData,
      company_id: companyId,
      company_name: companyData?.name || profileData.company,
      unipile_scraped_at: new Date().toISOString(),
      processing_status: 'processing'
    };

    const { error: updateError } = await supabaseClient
      .from('linkedin_posts')
      .update(updateData)
      .eq('id', post.id);

    if (updateError) {
      throw new Error(`Failed to update post: ${updateError.message}`);
    }

    console.log(`✅ Unipile processing completed for post: ${post.id}`);

    // 6. Déclencher la création du lead
    console.log(`🚀 Triggering lead creation for post ${post.id}`);
    try {
      await supabaseClient.functions.invoke('specialized-lead-worker', {
        body: { 
          post_id: post.id,
          dataset_id: datasetId || null
        }
      });
      console.log(`🎯 Lead creation triggered for post ${post.id}`);
    } catch (error) {
      console.error(`❌ Error triggering lead creation for post ${post.id}:`, error);
    }

    return {
      post_id: post.id,
      success: true,
      profile_data: cleanedData,
      company_enriched: !!companyId
    };

  } catch (error) {
    console.error(`❌ Unipile processing failed for post ${post.id}:`, error);
    await handleUnipileError(supabaseClient, post.id, error);
    throw error;
  }
}

async function handleUnipileError(supabaseClient: any, postId: string, error: any) {
  try {
    await supabaseClient
      .from('linkedin_posts')
      .update({
        processing_status: 'unipile_error',
        retry_count: supabaseClient.sql`COALESCE(retry_count, 0) + 1`,
        last_retry_at: new Date().toISOString(),
        error_message: error.message
      })
      .eq('id', postId);
  } catch (updateError) {
    console.error('Failed to update post with error status:', updateError);
  }
}

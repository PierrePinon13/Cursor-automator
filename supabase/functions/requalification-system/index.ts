
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
    console.log('🔄 Requalification System started');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      action, 
      dataset_id, 
      age_hours = 24, 
      requalify_rejected = false,
      force_reprocess_all = false 
    } = await req.json();

    switch (action) {
      case 'requalify_old_posts':
        return await requalifyOldPosts(supabaseClient, age_hours, dataset_id);
      
      case 'requalify_rejected':
        return await requalifyRejectedPosts(supabaseClient, dataset_id);
      
      case 'smart_requalification':
        return await smartRequalification(supabaseClient, dataset_id);
      
      case 'emergency_reprocess':
        return await emergencyReprocess(supabaseClient, dataset_id, force_reprocess_all);
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error('❌ Error in requalification-system:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function requalifyOldPosts(supabaseClient: any, ageHours: number, datasetId?: string) {
  console.log(`🕐 Requalifying posts older than ${ageHours} hours...`);

  const cutoffDate = new Date(Date.now() - ageHours * 60 * 60 * 1000).toISOString();

  // Récupérer les posts anciens dans raw qui n'ont jamais été traités
  let query = supabaseClient
    .from('linkedin_posts_raw')
    .select('*')
    .lt('created_at', cutoffDate);

  if (datasetId) {
    query = query.eq('apify_dataset_id', datasetId);
  }

  const { data: oldRawPosts, error } = await query.limit(100);

  if (error) {
    throw new Error(`Error fetching old raw posts: ${error.message}`);
  }

  console.log(`📋 Found ${oldRawPosts.length} old raw posts to requalify`);

  let requalifiedCount = 0;
  
  for (const rawPost of oldRawPosts) {
    try {
      // Vérifier si ce post existe déjà dans linkedin_posts
      const { data: existingPost } = await supabaseClient
        .from('linkedin_posts')
        .select('id')
        .eq('urn', rawPost.urn)
        .single();

      if (existingPost) {
        console.log(`⏭️ Post already exists in processing queue: ${rawPost.urn}`);
        continue;
      }

      // Appliquer une nouvelle classification plus permissive
      const shouldRequalify = await enhancedClassification(rawPost);
      
      if (shouldRequalify.process) {
        console.log(`♻️ Requalifying post: ${rawPost.urn} - ${shouldRequalify.reason}`);
        
        // Créer l'entrée dans linkedin_posts pour traitement
        const postData = {
          apify_dataset_id: rawPost.apify_dataset_id,
          urn: rawPost.urn,
          text: rawPost.text || 'Content unavailable',
          title: rawPost.title,
          url: rawPost.url,
          posted_at_timestamp: rawPost.posted_at_timestamp,
          posted_at_iso: rawPost.posted_at_iso,
          author_type: rawPost.author_type,
          author_profile_url: rawPost.author_profile_url,
          author_profile_id: rawPost.author_profile_id,
          author_name: rawPost.author_name,
          author_headline: rawPost.author_headline,
          processing_status: 'queued',
          processing_priority: shouldRequalify.priority + 2, // Priorité plus faible pour requalification
          raw_data: rawPost.raw_data
        };

        const { data: insertedPost, error: insertError } = await supabaseClient
          .from('linkedin_posts')
          .insert(postData)
          .select('id')
          .single();

        if (insertError) {
          console.error(`❌ Error requalifying post ${rawPost.urn}:`, insertError);
          continue;
        }

        // Déclencher le traitement
        supabaseClient.functions.invoke('specialized-openai-worker', {
          body: { 
            post_id: insertedPost.id, 
            dataset_id: rawPost.apify_dataset_id,
            step: 'step1'
          }
        }).catch((err: any) => {
          console.error(`Error triggering processing for requalified post:`, err);
        });

        requalifiedCount++;
      }

    } catch (error) {
      console.error(`❌ Error processing raw post ${rawPost.urn}:`, error);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    action: 'requalify_old_posts',
    age_hours: ageHours,
    total_found: oldRawPosts.length,
    requalified_count: requalifiedCount,
    dataset_id: datasetId
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function requalifyRejectedPosts(supabaseClient: any, datasetId?: string) {
  console.log('🔄 Requalifying previously rejected posts...');

  // Récupérer les posts rejetés qui pourraient être requalifiés
  let query = supabaseClient
    .from('linkedin_posts')
    .select('*')
    .in('processing_status', ['not_job_posting', 'filtered_out'])
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Derniers 7 jours

  if (datasetId) {
    query = query.eq('apify_dataset_id', datasetId);
  }

  const { data: rejectedPosts, error } = await query.limit(50);

  if (error) {
    throw new Error(`Error fetching rejected posts: ${error.message}`);
  }

  console.log(`📋 Found ${rejectedPosts.length} rejected posts to requalify`);

  let requalifiedCount = 0;

  for (const post of rejectedPosts) {
    try {
      // Appliquer des critères de requalification plus souples
      const shouldRequalify = await requalificationCriteria(post);
      
      if (shouldRequalify.requalify) {
        console.log(`♻️ Requalifying rejected post: ${post.urn} - ${shouldRequalify.reason}`);
        
        // Réinitialiser le post pour retraitement
        await supabaseClient
          .from('linkedin_posts')
          .update({
            processing_status: 'queued',
            processing_priority: 4, // Priorité basse
            retry_count: 0,
            openai_step1_recrute_poste: null,
            openai_step2_reponse: null,
            openai_step3_categorie: null,
            last_retry_at: new Date().toISOString()
          })
          .eq('id', post.id);

        // Déclencher le retraitement
        supabaseClient.functions.invoke('specialized-openai-worker', {
          body: { 
            post_id: post.id, 
            dataset_id: post.apify_dataset_id,
            step: 'step1'
          }
        }).catch((err: any) => {
          console.error(`Error triggering reprocessing:`, err);
        });

        requalifiedCount++;
      }

    } catch (error) {
      console.error(`❌ Error requalifying post ${post.id}:`, error);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    action: 'requalify_rejected',
    total_found: rejectedPosts.length,
    requalified_count: requalifiedCount,
    dataset_id: datasetId
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function smartRequalification(supabaseClient: any, datasetId?: string) {
  console.log('🧠 Running smart requalification analysis...');

  // Analyser les patterns de succès pour améliorer la qualification
  const { data: successStats } = await supabaseClient
    .from('linkedin_posts')
    .select('openai_step1_postes, openai_step3_categorie, author_type, processing_status')
    .eq('processing_status', 'completed')
    .not('lead_id', 'is', null);

  // Analyser les posts rejetés avec des patterns similaires aux succès
  let query = supabaseClient
    .from('linkedin_posts')
    .select('*')
    .in('processing_status', ['not_job_posting', 'filtered_out'])
    .gte('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString());

  if (datasetId) {
    query = query.eq('apify_dataset_id', datasetId);
  }

  const { data: rejectedPosts, error } = await query.limit(30);

  if (error) {
    throw new Error(`Error fetching posts for smart requalification: ${error.message}`);
  }

  console.log(`📊 Analyzing ${rejectedPosts.length} rejected posts for smart requalification`);

  let smartRequalifiedCount = 0;

  for (const post of rejectedPosts) {
    try {
      // Analyse intelligente basée sur les patterns de succès
      const smartScore = calculateSmartScore(post, successStats || []);
      
      if (smartScore > 0.6) { // Seuil de confiance
        console.log(`🧠 Smart requalifying post: ${post.urn} (score: ${smartScore.toFixed(2)})`);
        
        await supabaseClient
          .from('linkedin_posts')
          .update({
            processing_status: 'queued',
            processing_priority: 3, // Priorité moyenne
            retry_count: 0,
            openai_step1_recrute_poste: null,
            openai_step2_reponse: null,
            last_retry_at: new Date().toISOString()
          })
          .eq('id', post.id);

        supabaseClient.functions.invoke('specialized-openai-worker', {
          body: { 
            post_id: post.id, 
            dataset_id: post.apify_dataset_id,
            step: 'step1'
          }
        }).catch((err: any) => {
          console.error(`Error triggering smart reprocessing:`, err);
        });

        smartRequalifiedCount++;
      }

    } catch (error) {
      console.error(`❌ Error in smart requalification for post ${post.id}:`, error);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    action: 'smart_requalification',
    analyzed_count: rejectedPosts.length,
    requalified_count: smartRequalifiedCount,
    dataset_id: datasetId
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function emergencyReprocess(supabaseClient: any, datasetId?: string, forceAll: boolean = false) {
  console.log('🚨 Emergency reprocessing system activated');

  // Récupérer tous les posts en erreur ou bloqués
  let query = supabaseClient
    .from('linkedin_posts')
    .select('*')
    .in('processing_status', ['error', 'failed_max_retries', 'retry_scheduled']);

  if (!forceAll) {
    // Limiter aux 24 dernières heures si pas force
    query = query.gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  }

  if (datasetId) {
    query = query.eq('apify_dataset_id', datasetId);
  }

  const { data: errorPosts, error } = await query.limit(100);

  if (error) {
    throw new Error(`Error fetching posts for emergency reprocessing: ${error.message}`);
  }

  console.log(`🚨 Found ${errorPosts.length} posts for emergency reprocessing`);

  let reprocessedCount = 0;

  for (const post of errorPosts) {
    try {
      // Réinitialisation complète
      await supabaseClient
        .from('linkedin_posts')
        .update({
          processing_status: 'queued',
          processing_priority: 1, // Haute priorité
          retry_count: 0,
          openai_step1_recrute_poste: null,
          openai_step2_reponse: null,
          openai_step3_categorie: null,
          unipile_profile_scraped: false,
          approach_message_generated: false,
          lead_id: null,
          last_retry_at: new Date().toISOString()
        })
        .eq('id', post.id);

      reprocessedCount++;

    } catch (error) {
      console.error(`❌ Error in emergency reprocess for post ${post.id}:`, error);
    }
  }

  // Déclencher le traitement en batch
  if (reprocessedCount > 0) {
    supabaseClient.functions.invoke('processing-queue-manager', {
      body: { action: 'queue_posts' }
    }).catch((err: any) => {
      console.error(`Error triggering queue manager:`, err);
    });
  }

  return new Response(JSON.stringify({
    success: true,
    action: 'emergency_reprocess',
    total_found: errorPosts.length,
    reprocessed_count: reprocessedCount,
    force_all: forceAll,
    dataset_id: datasetId
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Classification améliorée pour la requalification
function enhancedClassification(item: any) {
  if (!item.urn || !item.url) {
    return { process: false, reason: 'Missing essential fields', priority: 0 };
  }

  // Critères plus souples pour la requalification
  if (item.text && item.text.length > 50) {
    return { process: true, reason: 'Has substantial text content', priority: 3 };
  }

  if (item.title && (item.title.toLowerCase().includes('recru') || 
                     item.title.toLowerCase().includes('hiring') ||
                     item.title.toLowerCase().includes('job') ||
                     item.title.toLowerCase().includes('poste'))) {
    return { process: true, reason: 'Title suggests recruitment', priority: 2 };
  }

  if (item.author_profile_url && item.author_name) {
    return { process: true, reason: 'Complete author profile', priority: 4 };
  }

  return { process: false, reason: 'Insufficient requalification criteria', priority: 0 };
}

// Critères de requalification pour posts rejetés
function requalificationCriteria(post: any) {
  // Si rejeté par Step 1 mais a des mots-clés de recrutement
  if (post.processing_status === 'not_job_posting') {
    const text = (post.text || '').toLowerCase();
    const recruitmentKeywords = ['recrute', 'hiring', 'job', 'poste', 'candidat', 'embauche', 'cherche'];
    
    if (recruitmentKeywords.some(keyword => text.includes(keyword))) {
      return { requalify: true, reason: 'Contains recruitment keywords' };
    }
  }

  // Si rejeté par Step 2 mais l'auteur semble être français
  if (post.processing_status === 'filtered_out') {
    const authorName = (post.author_name || '').toLowerCase();
    const frenchNames = ['jean', 'marie', 'pierre', 'sophie', 'antoine', 'claire'];
    
    if (frenchNames.some(name => authorName.includes(name))) {
      return { requalify: true, reason: 'Author appears to be French' };
    }
  }

  return { requalify: false, reason: 'No requalification criteria met' };
}

// Score intelligent basé sur les patterns de succès
function calculateSmartScore(post: any, successStats: any[]): number {
  let score = 0;

  // Analyser la longueur du texte
  const textLength = (post.text || '').length;
  if (textLength > 100) score += 0.3;
  if (textLength > 200) score += 0.2;

  // Analyser l'auteur
  if (post.author_type === 'Person') score += 0.2;
  if (post.author_headline && post.author_headline.toLowerCase().includes('rh')) score += 0.3;

  // Analyser les mots-clés
  const text = (post.text || '').toLowerCase();
  const keywords = ['recherch', 'recru', 'candidat', 'profil', 'équipe', 'poste'];
  const keywordMatches = keywords.filter(keyword => text.includes(keyword)).length;
  score += keywordMatches * 0.1;

  return Math.min(score, 1); // Limiter à 1
}


export interface LeadProcessingResult {
  success: boolean;
  batch_id: string;
  dataset_id: string;
  posts_received: number;
  posts_created: number;
  posts_skipped: number;
  processing_errors: number;
  unipile_triggered: boolean;
  message?: string;
}

export async function processFilteredPosts(
  supabaseClient: any,
  filtered_posts: any[],
  dataset_id: string,
  batch_id: string
): Promise<LeadProcessingResult> {
  console.log(`📥 Processing ${filtered_posts.length} filtered posts for Lead Creation`);

  let postsCreated = 0;
  let postsSkipped = 0;
  let processingErrors = 0;

  // Traiter chaque post filtré par n8n
  for (const filteredPost of filtered_posts) {
    try {
      const {
        urn,
        // Résultats OpenAI de n8n
        categorie: openai_step3_categorie,
        postes_selectionnes: openai_step3_postes_selectionnes,
        // Données originales du post
        text,
        title,
        url,
        posted_at_timestamp,
        author_profile_url,
        author_profile_id,
        author_name,
        // Nouvelles données de prénom/nom
        author
      } = filteredPost;

      if (!urn) {
        console.error('❌ Post missing URN, skipping');
        postsSkipped++;
        continue;
      }

      // Vérifier si le post existe déjà dans linkedin_posts
      const { data: existingPost } = await supabaseClient
        .from('linkedin_posts')
        .select('id')
        .eq('urn', urn)
        .single();

      if (existingPost) {
        console.log(`⚠️ Post ${urn} already exists in linkedin_posts, skipping`);
        postsSkipped++;
        continue;
      }

      // Extraire le prénom et nom de l'objet author si disponible
      const firstName = author?.firstName || null;
      const lastName = author?.lastName || null;
      const fullName = firstName && lastName ? `${firstName.trim()} ${lastName.trim()}` : author_name;

      console.log(`👤 Processing author data: ${fullName} (${firstName} ${lastName})`);

      // Créer le post dans linkedin_posts avec les résultats OpenAI et status 'queued_unipile'
      const postData = {
        apify_dataset_id: dataset_id,
        urn: urn,
        text: text,
        title: title,
        url: url,
        posted_at_timestamp: posted_at_timestamp ? parseInt(posted_at_timestamp) : null,
        author_profile_url: author_profile_url,
        author_profile_id: author_profile_id,
        author_name: fullName,
        author_type: 'Person',
        
        // Résultats OpenAI Step 1 (simulé pour compatibilité)
        openai_step1_recrute_poste: 'oui',
        openai_step1_postes: openai_step3_postes_selectionnes,
        
        // Résultats OpenAI Step 2 (simulé pour compatibilité)
        openai_step2_reponse: 'oui',
        openai_step2_langue: 'français',
        openai_step2_localisation: 'France',
        
        // Résultats OpenAI Step 3 (reçus de n8n)
        openai_step3_categorie: openai_step3_categorie,
        openai_step3_postes_selectionnes: Array.isArray(openai_step3_postes_selectionnes) 
          ? openai_step3_postes_selectionnes 
          : [openai_step3_postes_selectionnes],
        
        // Status pour la suite du traitement Unipile
        processing_status: 'queued_unipile',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_updated_at: new Date().toISOString(),
        raw_data: {
          ...filteredPost,
          author_first_name: firstName,
          author_last_name: lastName
        }
      };

      const { error: insertError } = await supabaseClient
        .from('linkedin_posts')
        .insert(postData);

      if (insertError) {
        console.error(`❌ Error inserting post ${urn}:`, insertError.message);
        processingErrors++;
      } else {
        postsCreated++;
        console.log(`✅ Post ${urn} created successfully with OpenAI results and author: ${fullName}`);
      }

    } catch (error) {
      console.error(`❌ Error processing filtered post:`, error?.message);
      processingErrors++;
    }
  }

  return {
    success: true,
    batch_id,
    dataset_id,
    posts_received: filtered_posts.length,
    posts_created: postsCreated,
    posts_skipped: postsSkipped,
    processing_errors: processingErrors,
    unipile_triggered: false
  };
}

export async function triggerUnipileProcessing(
  supabaseClient: any,
  dataset_id: string,
  postsCreated: number
): Promise<void> {
  if (postsCreated > 0) {
    console.log(`🚀 Triggering Unipile processing for ${postsCreated} new posts...`);
    
    try {
      const { error: unipileError } = await supabaseClient.functions.invoke('unipile-batch-worker', {
        body: { 
          dataset_id: dataset_id,
          batch_size: Math.min(postsCreated, 30)
        }
      });

      if (unipileError) {
        console.error('⚠️ Error triggering Unipile batch worker:', unipileError);
      } else {
        console.log('✅ Unipile batch worker triggered successfully');
      }
    } catch (triggerError) {
      console.error('❌ Exception triggering Unipile worker:', triggerError?.message);
    }
  }
}

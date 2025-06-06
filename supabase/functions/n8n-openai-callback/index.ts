
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
    console.log('🔄 N8N OpenAI Callback - Processing filtered posts')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const requestBody = await req.json()
    console.log('📥 Received callback payload:', JSON.stringify(requestBody, null, 2))
    
    // Ajuster le format pour correspondre à celui envoyé par n8n
    let batch_id, dataset_id, filtered_posts
    
    if (Array.isArray(requestBody) && requestBody.length > 0) {
      // Format array avec body et filtered_posts séparés
      const firstItem = requestBody[0]
      if (firstItem.body && firstItem.filtered_posts) {
        batch_id = firstItem.body.batch_id
        dataset_id = firstItem.body.dataset_id
        filtered_posts = firstItem.filtered_posts
      } else {
        throw new Error('Invalid array format: missing body or filtered_posts')
      }
    } else if (requestBody.batch_id && requestBody.dataset_id && requestBody.filtered_posts) {
      // Format direct
      batch_id = requestBody.batch_id
      dataset_id = requestBody.dataset_id
      filtered_posts = requestBody.filtered_posts
    } else {
      throw new Error('Invalid payload format')
    }
    
    if (!batch_id || !dataset_id || !filtered_posts || !Array.isArray(filtered_posts)) {
      console.error('❌ Invalid callback payload structure')
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Invalid payload: batch_id, dataset_id and filtered_posts array are required',
        received_keys: Object.keys(requestBody)
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`📥 Processing callback for batch ${batch_id}: ${filtered_posts.length} filtered posts`)

    let postsCreated = 0
    let postsSkipped = 0
    let processingErrors = 0

    // Traiter chaque post filtré par n8n
    for (const filteredPost of filtered_posts) {
      try {
        const {
          urn,
          // Résultats OpenAI de n8n (noms adaptés au format reçu)
          categorie: openai_step3_categorie,
          postes_selectionnes: openai_step3_postes_selectionnes,
          // Données originales du post
          text,
          title,
          url,
          posted_at_timestamp,
          author_profile_url,
          author_profile_id,
          author_name
        } = filteredPost

        if (!urn) {
          console.error('❌ Post missing URN, skipping')
          postsSkipped++
          continue
        }

        // Vérifier si le post existe déjà dans linkedin_posts
        const { data: existingPost } = await supabaseClient
          .from('linkedin_posts')
          .select('id')
          .eq('urn', urn)
          .single()

        if (existingPost) {
          console.log(`⚠️ Post ${urn} already exists in linkedin_posts, skipping`)
          postsSkipped++
          continue
        }

        // Créer le post dans linkedin_posts avec les résultats OpenAI et status 'pending_unipile'
        const postData = {
          apify_dataset_id: dataset_id,
          urn: urn,
          text: text,
          title: title,
          url: url,
          posted_at_timestamp: posted_at_timestamp ? parseInt(posted_at_timestamp) : null,
          author_profile_url: author_profile_url,
          author_profile_id: author_profile_id,
          author_name: author_name,
          author_type: 'Person', // Puisque filtré en amont
          
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
          
          // Status pour la suite du traitement
          processing_status: 'pending_unipile',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_updated_at: new Date().toISOString(),
          raw_data: filteredPost
        }

        const { error: insertError } = await supabaseClient
          .from('linkedin_posts')
          .insert(postData)

        if (insertError) {
          console.error(`❌ Error inserting post ${urn}:`, insertError.message)
          processingErrors++
        } else {
          postsCreated++
          console.log(`✅ Post ${urn} created successfully with OpenAI results`)
        }

      } catch (error) {
        console.error(`❌ Error processing filtered post:`, error?.message)
        processingErrors++
      }
    }

    // Déclencher le traitement Unipile pour les nouveaux posts
    if (postsCreated > 0) {
      console.log(`🚀 Triggering Unipile processing for ${postsCreated} new posts...`)
      
      try {
        const { error: unipileError } = await supabaseClient.functions.invoke('unipile-batch-worker', {
          body: { 
            dataset_id: dataset_id,
            batch_size: Math.min(postsCreated, 30)
          }
        })

        if (unipileError) {
          console.error('⚠️ Error triggering Unipile batch worker:', unipileError)
        } else {
          console.log('✅ Unipile batch worker triggered successfully')
        }
      } catch (triggerError) {
        console.error('❌ Exception triggering Unipile worker:', triggerError?.message)
      }
    }

    const result = {
      success: true,
      batch_id: batch_id,
      dataset_id: dataset_id,
      posts_received: filtered_posts.length,
      posts_created: postsCreated,
      posts_skipped: postsSkipped,
      processing_errors: processingErrors,
      unipile_triggered: postsCreated > 0
    }

    console.log(`✅ N8N callback completed:`, result)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Error in n8n-openai-callback:', error?.message)
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Internal server error',
      message: error?.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

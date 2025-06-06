
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

    const { batch_id, dataset_id, filtered_posts } = await req.json()
    
    if (!batch_id || !dataset_id || !filtered_posts || !Array.isArray(filtered_posts)) {
      console.error('❌ Invalid callback payload')
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Invalid payload: batch_id, dataset_id and filtered_posts array are required'
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
          openai_step1_recrute_poste,
          openai_step1_postes,
          openai_step2_reponse,
          openai_step2_langue,
          openai_step2_localisation,
          openai_step2_raison,
          openai_step3_categorie,
          openai_step3_postes_selectionnes,
          openai_step3_justification,
          // Données originales du post
          text,
          title,
          url,
          posted_at_iso,
          posted_at_timestamp,
          author_type,
          author_profile_url,
          author_profile_id,
          author_name,
          author_headline,
          raw_data
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
          posted_at_iso: posted_at_iso,
          posted_at_timestamp: posted_at_timestamp,
          author_type: author_type,
          author_profile_url: author_profile_url,
          author_profile_id: author_profile_id,
          author_name: author_name,
          author_headline: author_headline,
          raw_data: raw_data,
          
          // Résultats OpenAI Step 1
          openai_step1_recrute_poste: openai_step1_recrute_poste,
          openai_step1_postes: openai_step1_postes,
          
          // Résultats OpenAI Step 2
          openai_step2_reponse: openai_step2_reponse,
          openai_step2_langue: openai_step2_langue,
          openai_step2_localisation: openai_step2_localisation,
          openai_step2_raison: openai_step2_raison,
          
          // Résultats OpenAI Step 3
          openai_step3_categorie: openai_step3_categorie,
          openai_step3_postes_selectionnes: openai_step3_postes_selectionnes,
          openai_step3_justification: openai_step3_justification,
          
          // Status pour la suite du traitement
          processing_status: 'pending_unipile',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_updated_at: new Date().toISOString()
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

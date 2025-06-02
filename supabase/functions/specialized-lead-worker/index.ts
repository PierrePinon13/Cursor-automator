
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
    console.log('👤 Specialized Lead Worker started');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { post_id, dataset_id, batch_mode = false } = await req.json();
    
    if (batch_mode) {
      return await processBatchLeads(supabaseClient, dataset_id);
    } else {
      return await processSingleLead(supabaseClient, post_id, dataset_id);
    }

  } catch (error) {
    console.error('❌ Error in specialized-lead-worker:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processSingleLead(supabaseClient: any, postId: string, datasetId: string) {
  console.log(`👤 Processing lead creation for post: ${postId}`);

  // Récupérer le post complet
  const { data: post, error: fetchError } = await supabaseClient
    .from('linkedin_posts')
    .select('*')
    .eq('id', postId)
    .single();

  if (fetchError || !post) {
    throw new Error(`Post not found: ${postId}`);
  }

  try {
    // Vérifier si ce profil existe déjà comme lead
    const existingLead = await checkExistingLead(supabaseClient, post);
    
    if (existingLead) {
      console.log(`♻️ Lead already exists for profile: ${post.author_profile_id}`);
      
      // Mettre à jour le post avec l'ID du lead existant
      await supabaseClient
        .from('linkedin_posts')
        .update({
          lead_id: existingLead.id,
          processing_status: 'duplicate',
          last_updated_at: new Date().toISOString()
        })
        .eq('id', postId);

      return {
        success: true,
        action: 'existing_lead_linked',
        lead_id: existingLead.id,
        post_id: postId
      };
    }

    // Vérifier si c'est un client
    const clientMatch = await checkClientMatch(supabaseClient, post);
    
    // Créer un nouveau lead
    const leadData = {
      author_profile_id: post.author_profile_id,
      author_name: post.author_name || 'Unknown',
      author_headline: post.author_headline,
      author_profile_url: post.author_profile_url,
      company_name: post.unipile_company || 'Unknown',
      company_position: post.unipile_position,
      company_linkedin_id: post.unipile_company_linkedin_id,
      latest_post_urn: post.urn,
      latest_post_url: post.url,
      latest_post_date: post.posted_at_iso ? new Date(post.posted_at_iso) : null,
      openai_step3_categorie: post.openai_step3_categorie,
      openai_step3_postes_selectionnes: post.openai_step3_postes_selectionnes,
      openai_step3_justification: post.openai_step3_justification,
      openai_step2_localisation: post.openai_step2_localisation,
      is_client_lead: clientMatch.isClient,
      matched_client_id: clientMatch.clientId,
      matched_client_name: clientMatch.clientName,
      processing_status: 'completed'
    };

    const { data: newLead, error: leadError } = await supabaseClient
      .from('leads')
      .insert(leadData)
      .select('id')
      .single();

    if (leadError) {
      throw new Error(`Error creating lead: ${leadError.message}`);
    }

    // Mettre à jour le post avec l'ID du nouveau lead
    await supabaseClient
      .from('linkedin_posts')
      .update({
        lead_id: newLead.id,
        is_client_lead: clientMatch.isClient,
        matched_client_id: clientMatch.clientId,
        matched_client_name: clientMatch.clientName,
        processing_status: 'completed',
        last_updated_at: new Date().toISOString()
      })
      .eq('id', postId);

    // Générer le message d'approche si ce n'est pas un client
    if (!clientMatch.isClient) {
      await generateApproachMessage(supabaseClient, newLead.id, post);
    }

    console.log(`✅ Lead created successfully: ${newLead.id}`);

    return {
      success: true,
      action: 'new_lead_created',
      lead_id: newLead.id,
      post_id: postId,
      is_client: clientMatch.isClient
    };

  } catch (error) {
    console.error(`❌ Error processing lead for post ${postId}:`, error);
    
    await supabaseClient
      .from('linkedin_posts')
      .update({
        processing_status: 'lead_creation_error',
        retry_count: (post.retry_count || 0) + 1,
        last_retry_at: new Date().toISOString()
      })
      .eq('id', postId);

    throw error;
  }
}

async function processBatchLeads(supabaseClient: any, datasetId?: string) {
  console.log('📦 Processing batch lead creation...');

  // Récupérer les posts prêts pour la création de leads
  let query = supabaseClient
    .from('linkedin_posts')
    .select('*')
    .eq('processing_status', 'processing')
    .eq('unipile_profile_scraped', true)
    .is('lead_id', null);

  if (datasetId) {
    query = query.eq('apify_dataset_id', datasetId);
  }

  const { data: posts, error } = await query
    .order('processing_priority', { ascending: true })
    .limit(30);

  if (error) {
    throw new Error(`Error fetching posts for lead creation: ${error.message}`);
  }

  console.log(`🔄 Found ${posts.length} posts ready for lead creation`);

  const results = [];
  for (const post of posts) {
    try {
      const result = await processSingleLead(supabaseClient, post.id, post.apify_dataset_id);
      results.push({ post_id: post.id, success: true, result });
    } catch (error) {
      results.push({ post_id: post.id, success: false, error: error.message });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const errorCount = results.length - successCount;

  return {
    success: true,
    batch_size: posts.length,
    success_count: successCount,
    error_count: errorCount,
    results
  };
}

async function checkExistingLead(supabaseClient: any, post: any) {
  if (!post.author_profile_id) return null;

  const { data: existingLead, error } = await supabaseClient
    .from('leads')
    .select('id, latest_post_date')
    .eq('author_profile_id', post.author_profile_id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error checking existing lead:', error);
    return null;
  }

  if (existingLead) {
    // Mettre à jour la date du dernier post si plus récent
    const postDate = post.posted_at_iso ? new Date(post.posted_at_iso) : null;
    const existingDate = existingLead.latest_post_date ? new Date(existingLead.latest_post_date) : null;

    if (postDate && (!existingDate || postDate > existingDate)) {
      await supabaseClient
        .from('leads')
        .update({
          latest_post_urn: post.urn,
          latest_post_url: post.url,
          latest_post_date: postDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLead.id);
    }
  }

  return existingLead;
}

async function checkClientMatch(supabaseClient: any, post: any) {
  let isClient = false;
  let clientId = null;
  let clientName = null;

  // Vérifier d'abord par company_linkedin_id
  if (post.unipile_company_linkedin_id) {
    const { data: clientByLinkedInId } = await supabaseClient
      .from('clients')
      .select('id, company_name')
      .eq('company_linkedin_id', post.unipile_company_linkedin_id)
      .eq('tracking_enabled', true)
      .single();

    if (clientByLinkedInId) {
      isClient = true;
      clientId = clientByLinkedInId.id;
      clientName = clientByLinkedInId.company_name;
    }
  }

  // Vérifier par nom d'entreprise si pas trouvé par LinkedIn ID
  if (!isClient && post.unipile_company) {
    const { data: clientByName } = await supabaseClient
      .from('clients')
      .select('id, company_name')
      .ilike('company_name', `%${post.unipile_company}%`)
      .eq('tracking_enabled', true)
      .single();

    if (clientByName) {
      isClient = true;
      clientId = clientByName.id;
      clientName = clientByName.company_name;
    }
  }

  return { isClient, clientId, clientName };
}

async function generateApproachMessage(supabaseClient: any, leadId: string, post: any) {
  console.log(`💬 Generating approach message for lead: ${leadId}`);

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.log('⚠️ OpenAI API key not configured, skipping message generation');
      return;
    }

    const prompt = `Générez un message LinkedIn personnalisé pour ce recruteur.

Profil du recruteur:
- Nom: ${post.author_name}
- Poste: ${post.unipile_position || 'Non spécifié'}
- Entreprise: ${post.unipile_company || 'Non spécifiée'}
- Secteur détecté: ${post.openai_step3_categorie}

Post de recrutement:
"${post.text}"

Postes recherchés: ${post.openai_step3_postes_selectionnes?.join(', ') || 'Non spécifiés'}

Créez un message de 200-300 caractères maximum, personnalisé et professionnel, proposant nos services de conseil en recrutement.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Tu es un expert en communication commerciale pour le secteur du recrutement.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 200
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const approachMessage = data.choices[0].message.content.trim();

    // Sauvegarder le message généré
    await supabaseClient
      .from('leads')
      .update({
        approach_message: approachMessage,
        approach_message_generated: true,
        approach_message_generated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    console.log(`✅ Approach message generated for lead: ${leadId}`);

  } catch (error) {
    console.error(`❌ Error generating approach message for lead ${leadId}:`, error);
    
    // Marquer l'erreur mais ne pas faire échouer la création du lead
    await supabaseClient
      .from('leads')
      .update({
        approach_message_generated: false,
        approach_message_error: error.message
      })
      .eq('id', leadId);
  }
}

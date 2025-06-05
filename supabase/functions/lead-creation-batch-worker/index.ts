
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
    console.log('👤 Lead Creation Batch Worker - Starting');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { dataset_id, batch_size = 50 } = await req.json();
    
    console.log(`🎯 Processing Lead Creation batch for dataset: ${dataset_id}`);

    // Récupérer les posts prêts pour la création de leads
    const { data: posts, error: fetchError } = await supabaseClient
      .from('linkedin_posts')
      .select('*')
      .eq('processing_status', 'queued_lead_creation')
      .eq('apify_dataset_id', dataset_id)
      .limit(batch_size);

    if (fetchError) {
      throw new Error(`Failed to fetch posts: ${fetchError.message}`);
    }

    if (!posts || posts.length === 0) {
      console.log('✅ No posts queued for Lead Creation');
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No posts to process',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📥 Processing ${posts.length} posts for Lead Creation`);

    // Récupérer les clients pour le matching
    const { data: clients } = await supabaseClient
      .from('clients')
      .select('*');

    const clientMap = new Map();
    if (clients) {
      clients.forEach(client => {
        if (client.company_name) {
          clientMap.set(client.company_name.toLowerCase(), client);
        }
      });
    }

    // Marquer les posts comme en traitement
    await supabaseClient
      .from('linkedin_posts')
      .update({ processing_status: 'processing_lead_creation' })
      .in('id', posts.map(p => p.id));

    const results = {
      processed: 0,
      leads_created: 0,
      client_leads: 0,
      failed: 0,
      errors: []
    };

    const leadsToInsert = [];

    for (const post of posts) {
      try {
        console.log(`👤 Creating lead for post: ${post.id}`);
        
        // Vérifier si un lead existe déjà pour ce profil
        const { data: existingLead } = await supabaseClient
          .from('leads')
          .select('id')
          .eq('author_profile_id', post.author_profile_id)
          .single();

        if (existingLead) {
          console.log(`⚠️ Lead already exists for profile: ${post.author_profile_id}`);
          
          // Marquer le post comme completed
          await supabaseClient
            .from('linkedin_posts')
            .update({
              processing_status: 'completed',
              lead_id: existingLead.id,
              last_updated_at: new Date().toISOString()
            })
            .eq('id', post.id);

          results.processed++;
          continue;
        }

        // Vérifier si c'est un lead client
        let isClientLead = false;
        let matchedClient = null;

        if (post.unipile_company) {
          const companyLower = post.unipile_company.toLowerCase();
          matchedClient = clientMap.get(companyLower);
          isClientLead = !!matchedClient;
        }

        // Préparer les données du lead
        const leadData = {
          author_profile_id: post.author_profile_id,
          author_name: post.author_name,
          author_headline: post.author_headline,
          author_profile_url: post.author_profile_url,
          text: post.text,
          title: post.title,
          url: post.url,
          posted_at_iso: post.posted_at_iso,
          posted_at_timestamp: post.posted_at_timestamp,
          latest_post_date: post.posted_at_timestamp ? new Date(post.posted_at_timestamp) : null,
          latest_post_url: post.url,
          openai_step2_localisation: post.openai_step2_localisation,
          openai_step3_categorie: post.openai_step3_categorie,
          openai_step3_postes_selectionnes: post.openai_step3_postes_selectionnes,
          openai_step3_justification: post.openai_step3_justification,
          unipile_company: post.unipile_company,
          unipile_position: post.unipile_position,
          unipile_company_linkedin_id: post.unipile_company_linkedin_id,
          company_name: post.unipile_company,
          company_position: post.unipile_position,
          company_linkedin_id: post.unipile_company_linkedin_id,
          apify_dataset_id: post.apify_dataset_id,
          is_client_lead: isClientLead,
          matched_client_id: matchedClient?.id || null,
          matched_client_name: matchedClient?.company_name || null,
          processing_status: 'completed'
        };

        leadsToInsert.push(leadData);

        results.processed++;
        results.leads_created++;
        if (isClientLead) {
          results.client_leads++;
        }

        console.log(`✅ Lead prepared for post: ${post.id} - ${isClientLead ? 'CLIENT' : 'STANDARD'}`);

      } catch (error) {
        console.error(`❌ Lead creation failed for post ${post.id}:`, error);
        
        await supabaseClient
          .from('linkedin_posts')
          .update({
            processing_status: 'error_lead_creation',
            retry_count: (post.retry_count || 0) + 1,
            last_retry_at: new Date().toISOString()
          })
          .eq('id', post.id);

        results.failed++;
        results.errors.push({ post_id: post.id, error: error.message });
      }
    }

    // Insérer tous les leads en une seule fois
    if (leadsToInsert.length > 0) {
      const { data: insertedLeads, error: insertError } = await supabaseClient
        .from('leads')
        .insert(leadsToInsert)
        .select('id, author_profile_id');

      if (insertError) {
        throw new Error(`Failed to insert leads: ${insertError.message}`);
      }

      console.log(`✅ Inserted ${insertedLeads.length} leads`);

      // Mettre à jour les posts avec les IDs des leads créés
      const leadMap = new Map();
      insertedLeads.forEach(lead => {
        leadMap.set(lead.author_profile_id, lead.id);
      });

      for (const post of posts) {
        const leadId = leadMap.get(post.author_profile_id);
        if (leadId) {
          await supabaseClient
            .from('linkedin_posts')
            .update({
              processing_status: 'completed',
              lead_id: leadId,
              last_updated_at: new Date().toISOString()
            })
            .eq('id', post.id);
        }
      }
    }

    const finalResult = {
      success: true,
      dataset_id,
      batch_size: posts.length,
      ...results
    };

    console.log('📊 Lead Creation Batch completed:', finalResult);

    return new Response(JSON.stringify(finalResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in lead-creation-batch-worker:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

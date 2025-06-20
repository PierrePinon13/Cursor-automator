
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
    console.log('📥 Received n8n jobs callback');
    
    const requestBody = await req.json();
    console.log('📋 Jobs callback payload:', JSON.stringify(requestBody, null, 2));

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle array of jobs or single job
    const jobs = Array.isArray(requestBody) ? requestBody : [requestBody];
    
    let processed = 0;
    let errors = 0;

    for (const jobData of jobs) {
      try {
        // Valider que c'est bien un job
        if (jobData.type !== 'JOB') {
          console.warn('⚠️ Skipping non-job data:', jobData.type);
          continue;
        }

        if (!jobData.id || !jobData.title || !jobData.company) {
          console.error('❌ Missing required job fields:', jobData);
          errors++;
          continue;
        }

        console.log('💾 Processing job:', jobData.title, 'from', jobData.company.name);

        // Trouver le client correspondant
        const { data: matchedClient, error: clientError } = await supabaseClient
          .from('clients')
          .select('id, company_name')
          .eq('company_linkedin_id', jobData.company.public_identifier)
          .single();

        if (clientError && clientError.code !== 'PGRST116') {
          console.error('❌ Error finding client:', clientError);
          errors++;
          continue;
        }

        // Vérifier si l'offre existe déjà (éviter les doublons)
        const { data: existingOffer, error: checkError } = await supabaseClient
          .from('client_job_offers')
          .select('id')
          .eq('url', jobData.url)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('❌ Error checking existing offer:', checkError);
          errors++;
          continue;
        }

        if (existingOffer) {
          console.log('ℹ️ Job offer already exists, skipping:', jobData.url);
          continue;
        }

        // Préparer les données de l'offre
        const offerData = {
          title: jobData.title,
          company_name: jobData.company.name,
          url: jobData.url,
          location: jobData.location || null,
          posted_at: jobData.posted_at ? new Date(jobData.posted_at).toISOString() : null,
          description: null, // Pas de description dans les données reçues
          job_type: null, // Pas de type spécifique dans les données reçues
          salary: null, // Pas de salaire dans les données reçues
          matched_client_id: matchedClient?.id || null,
          matched_client_name: matchedClient?.company_name || null,
          status: 'non_attribuee',
          apify_dataset_id: 'n8n_jobs', // Identifier que ça vient de n8n
          raw_data: jobData
        };

        // Insérer l'offre d'emploi
        const { error: insertError } = await supabaseClient
          .from('client_job_offers')
          .insert(offerData);

        if (insertError) {
          console.error('❌ Error inserting job offer:', insertError);
          errors++;
          continue;
        }

        processed++;
        console.log('✅ Job offer saved successfully:', jobData.title);

      } catch (error: any) {
        console.error('❌ Error processing job:', error);
        errors++;
      }
    }

    console.log(`🎉 Jobs processing completed: ${processed} processed, ${errors} errors`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Successfully processed ${processed} job offer(s)`,
      processed: processed,
      errors: errors,
      total: jobs.length
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('💥 Error in n8n-jobs-callback function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

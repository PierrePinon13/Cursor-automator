
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lead_id } = await req.json();

    if (!lead_id) {
      console.error('Missing lead_id in request');
      return new Response(
        JSON.stringify({ success: false, error: 'Lead ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Processing phone retrieval for lead:', lead_id);

    // Récupérer les infos du lead
    const { data: lead, error: leadError } = await supabase
      .from('linkedin_posts')
      .select('author_profile_url, phone_number, phone_retrieved_at')
      .eq('id', lead_id)
      .single();

    if (leadError || !lead) {
      console.error('Error fetching lead:', leadError);
      return new Response(
        JSON.stringify({ success: false, error: 'Lead not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Si le numéro a déjà été récupéré (même si null), le retourner
    if (lead.phone_retrieved_at) {
      console.log('Phone already retrieved for this lead:', lead.phone_number);
      return new Response(
        JSON.stringify({ 
          success: true, 
          phone_number: lead.phone_number,
          cached: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier que l'URL LinkedIn existe
    if (!lead.author_profile_url) {
      console.error('No LinkedIn profile URL for lead:', lead_id);
      
      // Marquer comme traité même sans URL
      await supabase
        .from('linkedin_posts')
        .update({
          phone_number: null,
          phone_retrieved_at: new Date().toISOString()
        })
        .eq('id', lead_id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          phone_number: null,
          cached: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer la clé API Datagma depuis les secrets Supabase
    const datagmaApiKey = Deno.env.get('DATAGMA_API_KEY');
    
    if (!datagmaApiKey) {
      console.error('Datagma API key not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Datagma API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Encoder l'URL LinkedIn pour l'API Datagma
    const encodedLinkedInUrl = encodeURIComponent(lead.author_profile_url);
    
    // Appeler l'API Datagma
    const datagmaUrl = `https://gateway.datagma.net/api/ingress/v1/search?apiId=${datagmaApiKey}&username=${encodedLinkedInUrl}&minimumMatch=1`;
    
    console.log('Calling Datagma API for lead:', lead_id);
    
    let phoneNumber = null;
    let datagmaError = null;
    
    try {
      const datagmaResponse = await fetch(datagmaUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!datagmaResponse.ok) {
        const errorText = await datagmaResponse.text();
        console.error('Datagma API error:', datagmaResponse.status, errorText);
        
        // Essayer de parser l'erreur JSON si possible
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.message) {
            datagmaError = `Erreur Datagma: ${errorData.message}`;
          } else {
            datagmaError = `Erreur Datagma (${datagmaResponse.status}): ${errorText}`;
          }
        } catch {
          datagmaError = `Erreur Datagma (${datagmaResponse.status}): ${errorText}`;
        }
      } else {
        const datagmaData = await datagmaResponse.json();
        console.log('Datagma response for lead:', lead_id, datagmaData);

        // Extraire le numéro de téléphone des résultats
        if (datagmaData && datagmaData.person && datagmaData.person.phones && Array.isArray(datagmaData.person.phones) && datagmaData.person.phones.length > 0) {
          const firstPhone = datagmaData.person.phones[0];
          phoneNumber = firstPhone.displayInternational || firstPhone.display || firstPhone.number;
          console.log('Phone number found for lead:', lead_id, phoneNumber);
        } else {
          console.log('No phone number found in Datagma response for lead:', lead_id);
        }
      }
    } catch (fetchError) {
      console.error('Error calling Datagma API for lead:', lead_id, fetchError);
      datagmaError = `Erreur de connexion à Datagma: ${fetchError.message}`;
    }

    // Mettre à jour le lead avec le résultat (même si null)
    const { error: updateError } = await supabase
      .from('linkedin_posts')
      .update({
        phone_number: phoneNumber,
        phone_retrieved_at: new Date().toISOString()
      })
      .eq('id', lead_id);

    if (updateError) {
      console.error('Error updating lead with phone number:', lead_id, updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save phone number' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Phone retrieval completed for lead:', lead_id, 'Result:', phoneNumber, 'Error:', datagmaError);

    return new Response(
      JSON.stringify({ 
        success: true, 
        phone_number: phoneNumber,
        cached: false,
        datagma_error: datagmaError
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in phone retrieval:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

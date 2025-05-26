
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
      return new Response(
        JSON.stringify({ error: 'Lead ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer les infos du lead
    const { data: lead, error: leadError } = await supabase
      .from('linkedin_posts')
      .select('author_profile_url, phone_number, phone_retrieved_at')
      .eq('id', lead_id)
      .single();

    if (leadError || !lead) {
      console.error('Error fetching lead:', leadError);
      return new Response(
        JSON.stringify({ error: 'Lead not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Si le numéro a déjà été récupéré, le retourner
    if (lead.phone_number && lead.phone_retrieved_at) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          phone_number: lead.phone_number,
          cached: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Encoder l'URL LinkedIn pour l'API Datagma
    const encodedLinkedInUrl = encodeURIComponent(lead.author_profile_url);
    const datagmaApiKey = '3edad5097012';
    
    // Appeler l'API Datagma
    const datagmaUrl = `https://gateway.datagma.net/api/ingress/v1/search?apiId=${datagmaApiKey}&username=${encodedLinkedInUrl}&minimumMatch=1`;
    
    console.log('Calling Datagma API:', datagmaUrl);
    
    const datagmaResponse = await fetch(datagmaUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!datagmaResponse.ok) {
      console.error('Datagma API error:', datagmaResponse.status, await datagmaResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to fetch data from Datagma API' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const datagmaData = await datagmaResponse.json();
    console.log('Datagma response:', datagmaData);

    // Extraire le numéro de téléphone des résultats - correction ici
    let phoneNumber = null;
    if (datagmaData && datagmaData.person && datagmaData.person.phones && Array.isArray(datagmaData.person.phones) && datagmaData.person.phones.length > 0) {
      // Prendre le premier numéro trouvé, de préférence au format international
      const firstPhone = datagmaData.person.phones[0];
      phoneNumber = firstPhone.displayInternational || firstPhone.display || firstPhone.number;
    }

    console.log('Extracted phone number:', phoneNumber);

    // Mettre à jour le lead avec le numéro de téléphone (même si null)
    const { error: updateError } = await supabase
      .from('linkedin_posts')
      .update({
        phone_number: phoneNumber,
        phone_retrieved_at: new Date().toISOString()
      })
      .eq('id', lead_id);

    if (updateError) {
      console.error('Error updating lead with phone number:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save phone number' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        phone_number: phoneNumber,
        cached: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

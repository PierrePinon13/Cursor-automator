
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const webhookData = await req.json()
    console.log('LinkedIn webhook received:', JSON.stringify(webhookData, null, 2))

    const { account_id, status, metadata, error: unipileError, name } = webhookData

    if (!account_id) {
      console.error('No account_id in webhook data')
      return new Response('Missing account_id', { status: 400 })
    }

    // Essayer de trouver la connexion en attente pour cet utilisateur
    // On utilise le nom (email) pour identifier l'utilisateur
    let connectionData = null

    if (name) {
      // Trouver l'utilisateur par email dans les métadonnées ou le nom
      const { data: connections, error: searchError } = await supabaseClient
        .from('linkedin_connections')
        .select('*, profiles!inner(email)')
        .eq('status', 'pending')
        .eq('profiles.email', name)
        .order('created_at', { ascending: false })
        .limit(1)

      if (!searchError && connections && connections.length > 0) {
        connectionData = connections[0]
      }
    }

    // Si on n'a pas trouvé par email, essayer de trouver la connexion la plus récente en attente
    if (!connectionData) {
      const { data: recentConnections, error: recentError } = await supabaseClient
        .from('linkedin_connections')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)

      if (!recentError && recentConnections && recentConnections.length > 0) {
        connectionData = recentConnections[0]
      }
    }

    if (!connectionData) {
      console.log('No pending connection found for account_id:', account_id, 'and name:', name)
      return new Response('No matching pending connection found', { status: 404 })
    }

    // Update connection status based on webhook
    let updateData: any = {
      account_id: account_id, // Stocker l'account_id reçu de Unipile
      unipile_account_id: account_id, // Mettre à jour avec le vrai ID
      last_update: new Date().toISOString()
    }

    switch (status) {
      case 'CREATION_SUCCESS':
        updateData.status = 'connected'
        updateData.connection_status = 'connected'
        updateData.connected_at = new Date().toISOString()
        updateData.error_message = null
        console.log('LinkedIn connection successful for account:', account_id)
        break

      case 'RECONNECTED':
        updateData.status = 'connected'
        updateData.connection_status = 'connected'
        updateData.connected_at = new Date().toISOString()
        updateData.error_message = null
        console.log('LinkedIn reconnection successful for account:', account_id)
        break

      case 'CREDENTIALS':
        updateData.status = 'credentials_required'
        updateData.connection_status = 'credentials_required'
        updateData.error_message = 'Credentials update required'
        console.log('LinkedIn credentials required for account:', account_id)
        break

      case 'ERROR':
        updateData.status = 'error'
        updateData.connection_status = 'error'
        updateData.error_message = unipileError || 'Unknown error occurred'
        console.log('LinkedIn connection error for account:', account_id, 'Error:', unipileError)
        break

      default:
        console.log('Unknown status received:', status)
        updateData.status = status
        updateData.connection_status = status
        if (unipileError) {
          updateData.error_message = unipileError
        }
    }

    // Update the connection in the database using the ID we found
    const { data, error } = await supabaseClient
      .from('linkedin_connections')
      .update(updateData)
      .eq('id', connectionData.id)
      .select()

    if (error) {
      console.error('Error updating LinkedIn connection:', error)
      return new Response('Database error', { status: 500 })
    }

    console.log('LinkedIn connection updated successfully:', data[0])

    return new Response('OK', { 
      status: 200,
      headers: corsHeaders
    })

  } catch (error) {
    console.error('Error in linkedin-webhook function:', error)
    return new Response('Internal server error', { 
      status: 500,
      headers: corsHeaders
    })
  }
})

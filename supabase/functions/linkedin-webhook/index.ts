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

    console.log('Processing webhook for account_id:', account_id, 'with status:', status)

    // First, try to find a pending connection (most recent webhook scenario)
    const { data: pendingConnections, error: pendingError } = await supabaseClient
      .from('linkedin_connections')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)

    let connectionData = null;
    let isNewConnection = false;

    if (pendingError) {
      console.error('Error searching for pending connections:', pendingError)
    }

    if (pendingConnections && pendingConnections.length > 0) {
      connectionData = pendingConnections[0]
      isNewConnection = true
      console.log('Found pending connection:', connectionData.id, 'temp_id:', connectionData.unipile_account_id)
    } else {
      // No pending connection, look for existing connection with this account_id
      console.log('No pending connection found, searching for existing connection with account_id:', account_id)
      
      const { data: existingConnections, error: existingError } = await supabaseClient
        .from('linkedin_connections')
        .select('*')
        .eq('account_id', account_id)
        .limit(1)

      if (existingError) {
        console.error('Error searching for existing connections:', existingError)
        return new Response('Database error', { status: 500 })
      }

      if (existingConnections && existingConnections.length > 0) {
        connectionData = existingConnections[0]
        console.log('Found existing connection:', connectionData.id, 'for account_id:', account_id)
      } else {
        console.log('No matching connection found for account_id:', account_id)
        return new Response('No matching connection found', { status: 404 })
      }
    }

    // Prepare update data based on webhook status
    let updateData: any = {
      last_update: new Date().toISOString()
    }

    // For new connections, set the real account_id from Unipile
    if (isNewConnection) {
      updateData.account_id = account_id
      console.log('Setting real account_id for new connection:', account_id)
    }

    // Update status based on webhook
    switch (status) {
      case 'CREATION_SUCCESS':
      case 'RECONNECTED':
        updateData.status = 'connected'
        updateData.connection_status = 'connected'
        updateData.connected_at = new Date().toISOString()
        updateData.error_message = null
        console.log(`LinkedIn connection ${status.toLowerCase()} for account:`, account_id)
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

    // Update the connection in the database
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

    // If the connection was successful and it's a new connection, clean up any old connections for this user
    if ((status === 'CREATION_SUCCESS' || status === 'RECONNECTED') && isNewConnection) {
      console.log('Cleaning up old connections for user:', connectionData.user_id)
      
      const { error: deleteError } = await supabaseClient
        .from('linkedin_connections')
        .delete()
        .eq('user_id', connectionData.user_id)
        .neq('id', connectionData.id) // Keep the current connection

      if (deleteError) {
        console.error('Error deleting old connections:', deleteError)
        // Don't fail the webhook for this error
      } else {
        console.log('Old connections deleted successfully for user:', connectionData.user_id)
      }
    }

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

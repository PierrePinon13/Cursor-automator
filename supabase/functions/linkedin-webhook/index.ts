
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

    const { account_id, status, metadata, error: unipileError } = webhookData

    if (!account_id) {
      console.error('No account_id in webhook data')
      return new Response('Missing account_id', { status: 400 })
    }

    // Update connection status based on webhook
    let updateData: any = {
      last_update: new Date().toISOString()
    }

    switch (status) {
      case 'CREATION_SUCCESS':
        updateData.status = 'connected'
        updateData.connected_at = new Date().toISOString()
        updateData.error_message = null
        console.log('LinkedIn connection successful for account:', account_id)
        break

      case 'RECONNECTED':
        updateData.status = 'connected'
        updateData.connected_at = new Date().toISOString()
        updateData.error_message = null
        console.log('LinkedIn reconnection successful for account:', account_id)
        break

      case 'CREDENTIALS':
        updateData.status = 'credentials_required'
        updateData.error_message = 'Credentials update required'
        console.log('LinkedIn credentials required for account:', account_id)
        break

      case 'ERROR':
        updateData.status = 'error'
        updateData.error_message = unipileError || 'Unknown error occurred'
        console.log('LinkedIn connection error for account:', account_id, 'Error:', unipileError)
        break

      default:
        console.log('Unknown status received:', status)
        updateData.status = status
        if (unipileError) {
          updateData.error_message = unipileError
        }
    }

    // Update the connection in the database
    const { data, error } = await supabaseClient
      .from('linkedin_connections')
      .update(updateData)
      .eq('unipile_account_id', account_id)
      .select()

    if (error) {
      console.error('Error updating LinkedIn connection:', error)
      return new Response('Database error', { status: 500 })
    }

    if (!data || data.length === 0) {
      console.log('No matching connection found for account_id:', account_id)
      // This might be a webhook for an account created outside our flow
      return new Response('No matching connection found', { status: 404 })
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

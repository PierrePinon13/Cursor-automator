
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
    console.log('=== LinkedIn webhook received ===')
    console.log('LinkedIn webhook received:', JSON.stringify(webhookData, null, 2))

    const { account_id, status, metadata, error: unipileError, name } = webhookData

    if (!account_id) {
      console.error('No account_id in webhook data')
      return new Response('Missing account_id', { status: 400 })
    }

    console.log('Processing webhook for account_id:', account_id, 'with status:', status)

    // Log webhook reception for debugging
    await supabaseClient
      .from('admin_actions_log')
      .insert({
        action_type: 'linkedin_webhook_received',
        action_details: webhookData,
        success: true
      })

    // Try to get user_id from metadata first, then by email from name field
    let user_id = metadata?.user_id
    
    if (!user_id && name) {
      console.log('No user_id in metadata, trying to find user by email:', name)
      
      // Try to find the user by email (name field often contains the email)
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('email', name)
        .maybeSingle()
      
      if (profile && !profileError) {
        user_id = profile.id
        console.log('Found user by email:', user_id)
      } else {
        console.log('Could not find user by email, error:', profileError)
        
        // If not found by email, try to find by unipile_account_id (in case of reconnection)
        console.log('Trying to find user by existing unipile_account_id:', account_id)
        const { data: existingProfile, error: existingError } = await supabaseClient
          .from('profiles')
          .select('id, email')
          .eq('unipile_account_id', account_id)
          .maybeSingle()
          
        if (existingProfile && !existingError) {
          user_id = existingProfile.id
          console.log('Found user by existing unipile_account_id:', user_id, 'email:', existingProfile.email)
        }
      }
    }
    
    if (!user_id) {
      console.error('No user_id found - tried metadata, email lookup, and account_id lookup')
      
      // Log all available information for debugging
      console.log('Available webhook data:', {
        account_id,
        status,
        metadata,
        name,
        allKeys: Object.keys(webhookData)
      })

      // Log this failure for admin review
      await supabaseClient
        .from('admin_actions_log')
        .insert({
          action_type: 'linkedin_webhook_user_not_found',
          action_details: {
            account_id,
            status,
            metadata,
            name,
            error: 'Could not identify user from webhook data'
          },
          success: false,
          error_message: 'Missing user_id in metadata and could not find user by email or account_id'
        })
      
      return new Response('Could not identify user from webhook data', { status: 400 })
    }

    console.log('Updating profile for user:', user_id, 'with account_id:', account_id)

    // Update the user's profile with the new unipile_account_id
    if (status === 'CREATION_SUCCESS' || status === 'RECONNECTED') {
      const { data, error } = await supabaseClient
        .from('profiles')
        .update({ 
          unipile_account_id: account_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', user_id)
        .select()

      if (error) {
        console.error('Error updating profile:', error)
        
        // Log the database error
        await supabaseClient
          .from('admin_actions_log')
          .insert({
            action_type: 'linkedin_webhook_profile_update_error',
            action_details: {
              user_id,
              account_id,
              error: error.message
            },
            success: false,
            error_message: error.message
          })

        return new Response('Database error', { status: 500 })
      }

      console.log('Profile updated successfully for user:', user_id, 'with account_id:', account_id)
      console.log('Updated profile data:', data)

      // Log successful update
      await supabaseClient
        .from('admin_actions_log')
        .insert({
          action_type: 'linkedin_webhook_profile_updated',
          action_details: {
            user_id,
            account_id,
            updated_profile: data[0]
          },
          success: true
        })

    } else if (status === 'CREATION_FAILED' || status === 'ERROR') {
      console.log('Connection failed with status:', status, 'Error:', unipileError)
      
      // Log connection failure
      await supabaseClient
        .from('admin_actions_log')
        .insert({
          action_type: 'linkedin_webhook_connection_failed',
          action_details: {
            user_id,
            account_id,
            status,
            error: unipileError
          },
          success: false,
          error_message: `Connection failed: ${status}`
        })
    } else {
      console.log('Status was not success, not updating profile. Status:', status)
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

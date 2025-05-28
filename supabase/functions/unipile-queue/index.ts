
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { executeWithRateLimit } from './operations/executor.ts';
import { getErrorResponse } from './utils/error-handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const requestBody = await req.json()
    const { action, account_id, operation, payload, priority = false } = requestBody

    console.log('🔧 Unipile queue request:', { action, account_id, operation, priority })
    console.log('📥 Full request body:', JSON.stringify(requestBody, null, 2))

    if (!account_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Account ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!operation) {
      return new Response(
        JSON.stringify({ success: false, error: 'Operation is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const unipileApiKey = Deno.env.get('UNIPILE_API_KEY')
    if (!unipileApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unipile API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (action === 'execute') {
      // Execute with rate limiting and retry logic
      const result = await executeWithRateLimit(account_id, operation, unipileApiKey, payload, priority);
      
      console.log(`🎉 Final result for ${operation}:`, JSON.stringify(result, null, 2));
      
      return new Response(
        JSON.stringify({ success: true, result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )

  } catch (error) {
    console.error('💥 Error in unipile-queue function:', error)
    console.error('🔍 Error stack trace:', error.stack)
    
    const errorResponse = getErrorResponse(error as Error);

    return new Response(
      JSON.stringify(errorResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

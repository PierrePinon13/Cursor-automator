
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { leadId, newCompanyLinkedInId, newCompanyName } = await req.json()

    console.log(`🔄 Checking if lead ${leadId} changed company...`)
    console.log(`New company: ${newCompanyName} (LinkedIn ID: ${newCompanyLinkedInId})`)

    // Récupérer les informations actuelles du lead
    const { data: currentLead, error: leadError } = await supabase
      .from('leads')
      .select('id, unipile_company_linkedin_id, company_linkedin_id, unipile_company, company_name, matched_hr_provider_id, matched_hr_provider_name, processing_status')
      .eq('id', leadId)
      .single()

    if (leadError) {
      console.error('❌ Error fetching lead:', leadError)
      throw leadError
    }

    if (!currentLead) {
      console.log('❌ Lead not found')
      return new Response(
        JSON.stringify({ success: false, error: 'Lead not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Vérifier si le lead était marqué comme prestataire RH
    const wasHrProvider = currentLead.processing_status === 'filtered_hr_provider' && currentLead.matched_hr_provider_id

    if (!wasHrProvider) {
      console.log('✅ Lead was not marked as HR provider, no action needed')
      return new Response(
        JSON.stringify({ success: true, message: 'No HR provider status to update' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Récupérer l'ancien LinkedIn ID de l'entreprise
    const oldCompanyLinkedInId = currentLead.unipile_company_linkedin_id || currentLead.company_linkedin_id
    const oldCompanyName = currentLead.unipile_company || currentLead.company_name

    // Vérifier si l'entreprise a vraiment changé
    const companyChanged = (
      (newCompanyLinkedInId && oldCompanyLinkedInId && newCompanyLinkedInId !== oldCompanyLinkedInId) ||
      (newCompanyName && oldCompanyName && newCompanyName !== oldCompanyName)
    )

    if (!companyChanged) {
      console.log('✅ Company has not changed, keeping HR provider status')
      return new Response(
        JSON.stringify({ success: true, message: 'Company unchanged, HR provider status maintained' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔄 Company changed from "${oldCompanyName}" (${oldCompanyLinkedInId}) to "${newCompanyName}" (${newCompanyLinkedInId})`)
    console.log(`Removing HR provider status from lead ${leadId}`)

    // Supprimer le statut de prestataire RH du lead
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        processing_status: 'completed',
        matched_hr_provider_id: null,
        matched_hr_provider_name: null,
        last_updated_at: new Date().toISOString()
      })
      .eq('id', leadId)

    if (updateError) {
      console.error('❌ Error updating lead status:', updateError)
      throw updateError
    }

    console.log('✅ Successfully removed HR provider status from lead')

    return new Response(
      JSON.stringify({
        success: true,
        message: `HR provider status removed from lead ${leadId} due to company change`,
        oldCompany: { name: oldCompanyName, linkedinId: oldCompanyLinkedInId },
        newCompany: { name: newCompanyName, linkedinId: newCompanyLinkedInId }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in update-lead-company-status:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

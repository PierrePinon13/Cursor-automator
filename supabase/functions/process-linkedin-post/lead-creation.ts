
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { UnipileScrapingResult } from './unipile-scraper.ts';
import { ClientMatchResult } from './client-matching.ts';
import { CompanyInfoResult } from './company-info-step.ts';

export interface LeadCreationResult {
  success: boolean;
  leadId?: string;
  action: 'created' | 'updated' | 'error';
  error?: string;
}

export async function createOrUpdateLead(
  supabaseClient: ReturnType<typeof createClient>,
  post: any,
  scrapingResult: UnipileScrapingResult,
  clientMatch: ClientMatchResult,
  companyInfo: CompanyInfoResult,
  approachMessage?: string
): Promise<LeadCreationResult> {
  try {
    console.log('🏗️ Creating or updating lead for profile:', post.author_profile_id);
    
    if (!post.author_profile_id) {
      console.log('❌ No author_profile_id found, cannot create lead');
      return {
        success: false,
        action: 'error',
        error: 'No LinkedIn profile ID available for lead creation'
      };
    }

    // Préparer les données du lead avec toutes les informations nécessaires
    const leadData = {
      // Identifiants
      author_profile_id: post.author_profile_id,
      author_profile_url: post.author_profile_url,
      
      // Informations personnelles
      author_name: post.author_name,
      author_headline: post.author_headline,
      
      // Dernière publication
      text: post.text,
      title: post.title,
      url: post.url,
      posted_at_iso: post.posted_at_iso,
      posted_at_timestamp: post.posted_at_timestamp,
      
      // ✅ CORRECTION : S'assurer que les données OpenAI sont bien copiées
      openai_step2_localisation: post.openai_step2_localisation || null,
      openai_step3_categorie: post.openai_step3_categorie || null,
      openai_step3_postes_selectionnes: post.openai_step3_postes_selectionnes || null,
      openai_step3_justification: post.openai_step3_justification || null,
      
      // Informations entreprise (Unipile)
      company_name: scrapingResult.company || null,
      company_position: scrapingResult.position || null,
      company_linkedin_id: scrapingResult.company_id || null,
      unipile_company: scrapingResult.company || null,
      unipile_position: scrapingResult.position || null,
      unipile_company_linkedin_id: scrapingResult.company_id || null,
      
      // ✅ NOUVEAU : Référence à l'entreprise dans la table companies
      company_id: companyInfo.success && companyInfo.companyId ? companyInfo.companyId : null,
      
      // Message d'approche
      approach_message: approachMessage || null,
      approach_message_generated: !!approachMessage,
      approach_message_generated_at: approachMessage ? new Date().toISOString() : null,
      
      // Correspondance client
      is_client_lead: clientMatch.isClientLead,
      matched_client_id: clientMatch.clientId || null,
      matched_client_name: clientMatch.clientName || null,
      
      // Informations du post le plus récent
      latest_post_date: post.posted_at_iso,
      latest_post_url: post.url,
      latest_post_urn: post.urn,
      
      // Métadonnées
      processing_status: 'completed',
      last_updated_at: new Date().toISOString()
    };

    console.log('📋 Lead data prepared:', {
      profile_id: leadData.author_profile_id,
      name: leadData.author_name,
      company: leadData.company_name,
      company_id: leadData.company_id,
      position: leadData.company_position,
      category: leadData.openai_step3_categorie,
      jobs: leadData.openai_step3_postes_selectionnes,
      is_client: leadData.is_client_lead,
      client_name: leadData.matched_client_name
    });

    // Créer le nouveau lead
    const { data: newLead, error: insertError } = await supabaseClient
      .from('leads')
      .insert(leadData)
      .select('id')
      .single();

    if (insertError || !newLead) {
      console.error('❌ Error creating new lead:', insertError);
      return {
        success: false,
        action: 'error',
        error: `Failed to create new lead: ${insertError?.message}`
      };
    }

    // Lier le post actuel au nouveau lead
    const { error: linkError } = await supabaseClient
      .from('linkedin_posts')
      .update({ 
        lead_id: newLead.id,
        processing_status: 'completed',
        last_updated_at: new Date().toISOString()
      })
      .eq('id', post.id);

    if (linkError) {
      console.error('⚠️ Error linking post to lead:', linkError);
      // Ne pas considérer cela comme une erreur fatale
    }

    console.log('✅ Lead created successfully:', newLead.id);
    return {
      success: true,
      leadId: newLead.id,
      action: 'created'
    };

  } catch (error: any) {
    console.error('❌ Error in lead creation:', error);
    return {
      success: false,
      action: 'error',
      error: error.message || 'Unknown error during lead creation'
    };
  }
}

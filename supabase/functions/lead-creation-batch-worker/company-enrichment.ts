
export async function enrichCompanyData(supabaseClient: any, companyLinkedInId: string | null) {
  if (!companyLinkedInId) {
    return { success: false, action: 'no_linkedin_id' };
  }

  console.log(`🏢 Checking company data for LinkedIn ID: ${companyLinkedInId}`);

  try {
    // Vérifier si l'entreprise existe déjà en base
    const { data: existingCompany, error: checkError } = await supabaseClient
      .from('companies')
      .select('*')
      .eq('linkedin_id', companyLinkedInId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing company:', checkError);
      return { success: false, error: checkError.message };
    }

    // Si l'entreprise existe et est complète (a une description et une taille), on garde
    if (existingCompany && existingCompany.description && existingCompany.company_size) {
      console.log(`✅ Company ${companyLinkedInId} already enriched`);
      return { 
        success: true, 
        companyId: existingCompany.id, 
        action: 'already_enriched' 
      };
    }

    // Sinon, enrichir via fetch-company-info
    console.log(`🔍 Enriching company ${companyLinkedInId}`);
    
    const { data: enrichResult, error: enrichError } = await supabaseClient.functions.invoke('fetch-company-info', {
      body: { companyLinkedInId }
    });

    if (enrichError || !enrichResult?.success) {
      console.error(`❌ Error enriching company ${companyLinkedInId}:`, enrichError || enrichResult?.error);
      return { 
        success: false, 
        error: enrichError?.message || enrichResult?.error || 'Unknown enrichment error',
        action: 'enrichment_failed'
      };
    }

    console.log(`✅ Company ${companyLinkedInId} successfully enriched`);
    return { 
      success: true, 
      companyId: enrichResult.company?.id, 
      action: existingCompany ? 'updated' : 'created' 
    };

  } catch (error) {
    console.error(`❌ Error during company enrichment for ${companyLinkedInId}:`, error);
    return { 
      success: false, 
      error: error.message,
      action: 'enrichment_error'
    };
  }
}

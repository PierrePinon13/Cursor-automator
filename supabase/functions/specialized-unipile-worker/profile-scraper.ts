
import { applyRateLimit, updateLastCallTime } from './rate-limiter.ts';

export function extractProfileData(unipileData: any) {
  let company = null;
  let position = null;
  let company_id = null;
  
  // Extraire les informations depuis l'expérience
  const experiences = unipileData.work_experience || unipileData.linkedin_profile?.experience || [];
  
  if (experiences.length > 0) {
    // Trouver l'expérience actuelle
    const currentExperience = experiences.find((exp: any) => 
      !exp.end || exp.end === null || exp.end === ''
    ) || experiences[0];

    if (currentExperience) {
      company = currentExperience.company || currentExperience.companyName || null;
      position = currentExperience.position || currentExperience.title || null;
      company_id = currentExperience.company_id || currentExperience.companyId || null;
    }
  }

  const provider_id = unipileData.provider_id || unipileData.public_identifier || null;

  return { company, position, company_id, provider_id, success: true };
}

export async function scrapeWithRateLimit(supabaseClient: any, accountId: string, authorProfileId: string, postId: string) {
  console.log(`🔍 Scraping profile ${authorProfileId} with account ${accountId}`);

  // Appliquer le rate limiting par compte
  await applyRateLimit(accountId);

  const unipileApiKey = Deno.env.get('UNIPILE_API_KEY');
  if (!unipileApiKey) {
    throw new Error('Unipile API key not configured');
  }

  const unipileUrl = `https://api9.unipile.com:13946/api/v1/users/${authorProfileId}?account_id=${accountId}&linkedin_sections=experience`;
  
  const response = await fetch(unipileUrl, {
    method: 'GET',
    headers: {
      'X-API-KEY': unipileApiKey,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Unipile API error for ${postId}:`, response.status, errorText);
    throw new Error(`Unipile API error: ${response.status} - ${errorText}`);
  }

  const unipileData = await response.json();
  console.log(`✅ Profile scraped for post ${postId}`);

  // Extraire les informations
  const scrapingResult = extractProfileData(unipileData);

  // Sauvegarder les résultats
  await supabaseClient
    .from('linkedin_posts')
    .update({
      unipile_company: scrapingResult.company,
      unipile_position: scrapingResult.position,
      unipile_company_linkedin_id: scrapingResult.company_id,
      unipile_profile_scraped: true,
      unipile_profile_scraped_at: new Date().toISOString(),
      unipile_response: unipileData
    })
    .eq('id', postId);

  // Mettre à jour le timestamp du dernier appel pour ce compte
  updateLastCallTime(accountId);

  return scrapingResult;
}

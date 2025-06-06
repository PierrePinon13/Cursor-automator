
export async function scrapeProfile(unipileApiKey: string, accountId: string, payload: any) {
  const { profileUrl } = payload;
  
  if (!profileUrl) {
    throw new Error('Missing profileUrl in payload');
  }
  
  // Extraire l'ID du profil depuis l'URL LinkedIn
  // Formats possibles :
  // https://www.linkedin.com/in/username
  // https://www.linkedin.com/in/username?param=value
  // https://www.linkedin.com/in/username/
  let profileId;
  
  try {
    const url = new URL(profileUrl);
    const pathParts = url.pathname.split('/').filter(part => part);
    
    if (pathParts.length >= 2 && pathParts[0] === 'in') {
      profileId = pathParts[1];
    } else {
      throw new Error('Invalid LinkedIn profile URL format');
    }
  } catch (error) {
    throw new Error(`Failed to parse LinkedIn profile URL: ${profileUrl}`);
  }
  
  console.log(`🔍 Scraping profile ${profileId} for account ${accountId}`);
  
  const response = await fetch(
    `https://api9.unipile.com:13946/api/v1/users/${profileId}?account_id=${accountId}&linkedin_sections=experience`,
    {
      method: 'GET',
      headers: {
        'X-API-KEY': unipileApiKey,
        'accept': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Scrape profile failed: ${response.status} - ${errorText}`);
    throw new Error(`Scrape profile failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('✅ Profile scraping result:', { 
    provider_id: result.provider_id, 
    network_distance: result.network_distance,
    headline: result.headline,
    company: result.company?.name 
  });

  return result;
}

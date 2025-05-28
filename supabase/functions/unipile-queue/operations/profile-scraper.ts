
export async function scrapeProfile(unipileApiKey: string, accountId: string, payload: any) {
  const { authorProfileId } = payload;
  
  if (!authorProfileId) {
    throw new Error('Missing authorProfileId in payload');
  }
  
  console.log(`🔍 Scraping profile ${authorProfileId} for account ${accountId}`);
  
  const response = await fetch(
    `https://api9.unipile.com:13946/api/v1/users/${authorProfileId}?account_id=${accountId}&linkedin_sections=experience`,
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

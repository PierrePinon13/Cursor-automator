
export async function scrapeCompany(unipileApiKey: string, accountId: string, payload: any) {
  const { companyLinkedInId } = payload;
  
  if (!companyLinkedInId) {
    throw new Error('Missing companyLinkedInId in payload');
  }
  
  console.log(`🏢 Scraping company ${companyLinkedInId} for account ${accountId}`);
  
  const response = await fetch(
    `https://api9.unipile.com:13946/api/v1/linkedin/company/${companyLinkedInId}?account_id=${accountId}`,
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
    console.error(`❌ Scrape company failed: ${response.status} - ${errorText}`);
    throw new Error(`Scrape company failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('✅ Company scraping result:', { 
    name: result.name, 
    industry: result.industry,
    followerCount: result.followerCount || result.followers_count
  });

  return result;
}

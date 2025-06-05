
// Gestionnaire multi-comptes avec rate limiting
const lastCallTimes = new Map<string, number>();

export async function getAvailableUnipileAccount(supabaseClient: any): Promise<string | null> {
  console.log('🔍 Searching for available Unipile account...');
  
  const { data: accounts, error } = await supabaseClient
    .from('profiles')
    .select('unipile_account_id')
    .not('unipile_account_id', 'is', null);

  if (error || !accounts?.length) {
    console.error('❌ No Unipile accounts found:', error);
    return null;
  }

  // Trouver le compte avec le délai le plus long depuis le dernier appel
  let bestAccount = accounts[0].unipile_account_id;
  let longestDelay = 0;

  for (const account of accounts) {
    const accountId = account.unipile_account_id;
    const lastCall = lastCallTimes.get(accountId) || 0;
    const delay = Date.now() - lastCall;

    if (delay > longestDelay) {
      longestDelay = delay;
      bestAccount = accountId;
    }
  }

  console.log(`✅ Selected account ${bestAccount} (delay: ${longestDelay}ms since last call)`);
  return bestAccount;
}

export async function applyRateLimit(accountId: string): Promise<void> {
  const lastCall = lastCallTimes.get(accountId) || 0;
  const now = Date.now();
  const timeSinceLastCall = now - lastCall;
  
  // Délai aléatoire entre 2-8 secondes
  const randomDelay = Math.floor(Math.random() * 6000) + 2000;
  
  if (timeSinceLastCall < randomDelay) {
    const waitTime = randomDelay - timeSinceLastCall;
    console.log(`⏳ Rate limiting: waiting ${waitTime}ms for account ${accountId}`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  // Mettre à jour le timestamp du dernier appel
  lastCallTimes.set(accountId, Date.now());
}

export async function scrapeCompanyInfo(supabaseClient: any, accountId: string, companyLinkedInId: string): Promise<any> {
  console.log(`🏢 Scraping company info for LinkedIn ID: ${companyLinkedInId}`);
  
  await applyRateLimit(accountId);
  
  const { data: result, error } = await supabaseClient.functions.invoke('unipile-queue', {
    body: {
      action: 'execute',
      account_id: accountId,
      operation: 'scrape_company',
      payload: {
        companyLinkedInId: companyLinkedInId
      },
      priority: false
    }
  });

  if (error || !result?.success) {
    throw new Error(`Company scraping failed: ${error?.message || result?.error}`);
  }

  return result.result;
}

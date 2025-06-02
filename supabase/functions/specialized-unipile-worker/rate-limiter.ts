
// Rate limiting per account
const lastCallTimes = new Map<string, number>();

export async function applyRateLimit(accountId: string) {
  const lastCall = lastCallTimes.get(accountId) || 0;
  const now = Date.now();
  const timeSinceLastCall = now - lastCall;
  
  // Random delay entre 2-8 secondes
  const randomDelay = Math.floor(Math.random() * 6000) + 2000;
  
  if (timeSinceLastCall < randomDelay) {
    const waitTime = randomDelay - timeSinceLastCall;
    console.log(`⏳ Rate limiting: waiting ${waitTime}ms for account ${accountId}`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
}

export function updateLastCallTime(accountId: string) {
  lastCallTimes.set(accountId, Date.now());
}

export async function getAvailableUnipileAccount(supabaseClient: any): Promise<string | null> {
  // Récupérer un compte qui n'a pas été utilisé récemment
  const { data: accounts, error } = await supabaseClient
    .from('profiles')
    .select('unipile_account_id')
    .not('unipile_account_id', 'is', null);

  if (error || !accounts?.length) {
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

  return bestAccount;
}

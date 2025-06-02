
// Gestion de rate limiting multi-comptes avec distribution intelligente
const accountLastCallTimes = new Map<string, number>();
const accountTaskQueues = new Map<string, Array<() => Promise<any>>>();

export function getRandomDelay(): number {
  return Math.floor(Math.random() * (8000 - 2000 + 1)) + 2000;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function checkRateLimitForAccount(accountId: string): Promise<void> {
  const lastCall = accountLastCallTimes.get(accountId) || 0;
  const now = Date.now();
  const timeSinceLastCall = now - lastCall;
  const minDelay = getRandomDelay();

  if (timeSinceLastCall < minDelay) {
    const waitTime = minDelay - timeSinceLastCall;
    console.log(`⏳ Rate limiting: waiting ${waitTime}ms for account ${accountId}`);
    await sleep(waitTime);
  }
}

export function updateAccountLastCallTime(accountId: string): void {
  accountLastCallTimes.set(accountId, Date.now());
}

export function getAvailableAccount(accountIds: string[]): string {
  // Retourner le compte avec le délai le plus long depuis le dernier appel
  let bestAccount = accountIds[0];
  let longestDelay = 0;

  for (const accountId of accountIds) {
    const lastCall = accountLastCallTimes.get(accountId) || 0;
    const delay = Date.now() - lastCall;

    if (delay > longestDelay) {
      longestDelay = delay;
      bestAccount = accountId;
    }
  }

  return bestAccount;
}

export function distributeTasksAcrossAccounts<T>(
  tasks: T[], 
  accountIds: string[]
): Array<{ accountId: string; tasks: T[] }> {
  const distribution: Array<{ accountId: string; tasks: T[] }> = 
    accountIds.map(id => ({ accountId: id, tasks: [] }));

  // Distribution round-robin
  tasks.forEach((task, index) => {
    const accountIndex = index % accountIds.length;
    distribution[accountIndex].tasks.push(task);
  });

  return distribution;
}

export async function executeWithAccountRateLimit<T>(
  accountId: string,
  operation: () => Promise<T>
): Promise<T> {
  await checkRateLimitForAccount(accountId);
  
  try {
    const result = await operation();
    updateAccountLastCallTime(accountId);
    return result;
  } catch (error) {
    // Mettre à jour le timestamp même en cas d'erreur pour éviter le spam
    updateAccountLastCallTime(accountId);
    throw error;
  }
}

// Gestion de batch avec parallélisation multi-comptes
export async function executeBatchWithMultipleAccounts<T, R>(
  items: T[],
  accountIds: string[],
  processor: (item: T, accountId: string) => Promise<R>
): Promise<Array<{ success: boolean; result?: R; error?: string; item: T }>> {
  
  if (accountIds.length === 0) {
    throw new Error('No accounts available');
  }

  const distribution = distributeTasksAcrossAccounts(items, accountIds);
  
  console.log(`📦 Distributing ${items.length} items across ${accountIds.length} accounts`);
  
  // Traitement parallèle par compte avec rate limiting
  const promises = distribution.map(async ({ accountId, tasks }) => {
    const results = [];
    
    for (const task of tasks) {
      try {
        const result = await executeWithAccountRateLimit(accountId, () => 
          processor(task, accountId)
        );
        results.push({ success: true, result, item: task });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error', 
          item: task 
        });
      }
    }
    
    return results;
  });

  // Attendre tous les résultats et les aplatir
  const allResults = await Promise.all(promises);
  return allResults.flat();
}

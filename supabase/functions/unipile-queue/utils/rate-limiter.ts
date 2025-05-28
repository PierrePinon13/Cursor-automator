
// Simple timestamp tracking per account_id
const lastCallTime = new Map<string, number>();

// Random delay between 2-8 seconds
export function getRandomDelay(): number {
  return Math.floor(Math.random() * (8000 - 2000 + 1)) + 2000;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Exponential backoff for retries
export function getRetryDelay(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds
}

export async function checkRateLimit(accountId: string): Promise<void> {
  const lastCall = lastCallTime.get(accountId) || 0;
  const now = Date.now();
  const timeSinceLastCall = now - lastCall;
  const minDelay = getRandomDelay();

  if (timeSinceLastCall < minDelay) {
    const waitTime = minDelay - timeSinceLastCall;
    console.log(`⏳ Rate limiting: waiting ${waitTime}ms before Unipile call for account ${accountId}`);
    await sleep(waitTime);
  }
}

export function updateLastCallTime(accountId: string): void {
  lastCallTime.set(accountId, Date.now());
}

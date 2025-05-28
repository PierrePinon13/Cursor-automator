
import { checkRateLimit, updateLastCallTime, getRetryDelay, sleep } from '../utils/rate-limiter.ts';
import { isClientError, isRetryableError } from '../utils/error-handler.ts';
import { scrapeProfile } from './profile-scraper.ts';
import { sendMessage } from './message-sender.ts';
import { sendInvitation } from './invitation-sender.ts';

export async function executeWithRateLimit(
  accountId: string, 
  operation: string, 
  unipileApiKey: string, 
  payload: any, 
  isPriority: boolean = false
) {
  console.log(`🚀 Executing ${operation} for account ${accountId} (priority: ${isPriority})`);
  console.log(`📄 Payload details:`, JSON.stringify(payload, null, 2));

  // Check if we need to wait before making the call
  await checkRateLimit(accountId);

  // Retry logic with exponential backoff
  let lastError: Error | null = null;
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt + 1}/${maxRetries} for ${operation}`);
      
      // Execute the API call based on operation type
      let result;
      
      switch (operation) {
        case 'scrape_profile':
          result = await scrapeProfile(unipileApiKey, accountId, payload);
          break;
        case 'send_message':
          result = await sendMessage(unipileApiKey, accountId, payload);
          break;
        case 'send_invitation':
          result = await sendInvitation(unipileApiKey, accountId, payload);
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      // Update last call time on success
      updateLastCallTime(accountId);

      console.log(`✅ Successfully executed ${operation} for account ${accountId} on attempt ${attempt + 1}`);
      console.log(`📋 Operation result:`, JSON.stringify(result, null, 2));
      return result;

    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Attempt ${attempt + 1} failed for ${operation}:`, error);

      // Don't retry on authentication or validation errors (4xx except 429)
      if (isClientError(lastError) && !lastError.message.includes('429')) {
        console.log(`🚫 Client error detected, not retrying: ${lastError.message}`);
        break;
      }

      // If it's the last attempt, don't wait
      if (attempt === maxRetries - 1) {
        break;
      }

      // Wait before retry with exponential backoff
      const retryDelay = getRetryDelay(attempt);
      console.log(`⏳ Waiting ${retryDelay}ms before retry ${attempt + 2}`);
      await sleep(retryDelay);
    }
  }

  // All retries failed
  console.error(`💥 All ${maxRetries} attempts failed for ${operation}:`, lastError);
  throw lastError;
}

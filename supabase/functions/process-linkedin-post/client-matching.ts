
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ProcessingContext } from './types.ts';
import { UnipileScrapingResult } from './unipile-scraper.ts';

export interface ClientMatchResult {
  isClientLead: boolean;
  clientId?: string;
  clientName?: string;
}

export async function checkIfLeadIsFromClient(
  supabaseClient: ReturnType<typeof createClient>,
  companyLinkedInId: string | null
): Promise<ClientMatchResult> {
  if (!companyLinkedInId) {
    console.log('No company LinkedIn ID provided for client matching');
    return { isClientLead: false };
  }

  try {
    console.log('Checking if company LinkedIn ID matches any client:', companyLinkedInId);
    
    const { data: matchingClient, error } = await supabaseClient
      .from('clients')
      .select('id, company_name, company_linkedin_id')
      .eq('company_linkedin_id', companyLinkedInId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking client match:', error);
      return { isClientLead: false };
    }

    if (matchingClient) {
      console.log('Lead matches client:', matchingClient.company_name);
      return {
        isClientLead: true,
        clientId: matchingClient.id,
        clientName: matchingClient.company_name
      };
    }

    console.log('No client match found for company LinkedIn ID:', companyLinkedInId);
    return { isClientLead: false };

  } catch (error) {
    console.error('Error in client matching:', error);
    return { isClientLead: false };
  }
}

export async function executeClientMatching(
  context: ProcessingContext,
  scrapingResult: UnipileScrapingResult
): Promise<ClientMatchResult> {
  try {
    console.log('🏢 Step 5: Client matching...');
    
    // Use the company LinkedIn ID from scraping result
    const companyLinkedInId = scrapingResult.company_id;
    
    const clientMatch = await checkIfLeadIsFromClient(
      context.supabaseClient,
      companyLinkedInId
    );

    // Update the post with client matching information
    const { error: updateError } = await context.supabaseClient
      .from('linkedin_posts')
      .update({
        is_client_lead: clientMatch.isClientLead,
        matched_client_id: clientMatch.clientId || null,
        matched_client_name: clientMatch.clientName || null
      })
      .eq('id', context.postId);

    if (updateError) {
      console.error('Error updating post with client match info:', updateError);
    }

    if (clientMatch.isClientLead) {
      console.log('✅ Client lead identified:', clientMatch.clientName);
    } else {
      console.log('ℹ️ Not a client lead, continuing with regular processing');
    }

    return clientMatch;

  } catch (error: any) {
    console.error('❌ Error in client matching step:', error);
    return { isClientLead: false };
  }
}

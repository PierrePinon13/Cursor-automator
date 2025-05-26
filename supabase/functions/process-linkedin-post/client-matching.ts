
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

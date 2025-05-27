
export interface UnipileScrapingResult {
  company: string | null;
  position: string | null;
  company_id: string | null;
  provider_id: string | null;
  success: boolean;
}

export async function scrapLinkedInProfile(
  unipileApiKey: string, 
  authorProfileId: string,
  accountId: string,
  supabaseClient: any
): Promise<UnipileScrapingResult> {
  console.log('Starting Unipile profile scraping via queue');
  
  if (!authorProfileId) {
    console.log('No author_profile_id available for Unipile scraping');
    return { company: null, position: null, company_id: null, provider_id: null, success: false };
  }

  try {
    // Use the queue system for rate limiting with medium priority (2) for scraping
    const queueResponse = await supabaseClient.functions.invoke('unipile-queue', {
      body: {
        action: 'add_to_queue',
        account_id: accountId,
        priority: 2, // Medium priority for scraping (lower than LinkedIn messages)
        operation: 'scrape_profile',
        payload: {
          authorProfileId: authorProfileId
        }
      }
    });

    if (queueResponse.error) {
      console.error('Queue error:', queueResponse.error);
      return { company: null, position: null, company_id: null, provider_id: null, success: false };
    }

    // Now process the queue
    const processResponse = await supabaseClient.functions.invoke('unipile-queue', {
      body: {
        action: 'process_queue',
        account_id: accountId
      }
    });

    if (processResponse.error || !processResponse.data?.success) {
      console.error('Queue processing error:', processResponse.error);
      return { company: null, position: null, company_id: null, provider_id: null, success: false };
    }

    const unipileData = processResponse.data.result;
    console.log('Unipile response received via queue:', unipileData);

    // Extract company, position, company_id and provider_id from response
    let company = null;
    let position = null;
    let company_id = null;
    let provider_id = null;
    
    // Get provider_id from the main profile data
    provider_id = unipileData.provider_id || unipileData.publicIdentifier || unipileData.linkedin_profile?.publicIdentifier || null;
    
    // Check both work_experience and linkedin_profile.experience structures
    const experiences = unipileData.work_experience || unipileData.linkedin_profile?.experience || [];
    
    if (experiences && experiences.length > 0) {
      console.log('Processing work experiences:', experiences);
      
      // Find current position (no end date or end is null)
      let currentExperience = experiences.find((exp: any) => 
        !exp.end || exp.end === null || exp.end === ''
      );
      
      // If no current position found, take the most recent one (first in array)
      if (!currentExperience) {
        currentExperience = experiences[0];
      }
      
      if (currentExperience) {
        company = currentExperience.company || null;
        position = currentExperience.position || currentExperience.title || null;
        company_id = currentExperience.company_id || null;
        
        console.log('Selected current experience:', {
          company,
          position,
          company_id,
          isCurrentPosition: !currentExperience.end,
          startDate: currentExperience.start,
          endDate: currentExperience.end
        });
      }
    } else {
      console.log('No work experience found in the response');
    }

    console.log('Unipile data extracted via queue:', { company, position, company_id, provider_id });
    return { company, position, company_id, provider_id, success: true };

  } catch (unipileError) {
    console.error('Error calling Unipile API via queue:', unipileError);
    return { company: null, position: null, company_id: null, provider_id: null, success: false };
  }
}

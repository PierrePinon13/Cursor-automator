
export interface UnipileScrapingResult {
  company: string | null;
  position: string | null;
  success: boolean;
}

// Add random delay between 2-8 seconds
function getRandomDelay(): number {
  return Math.floor(Math.random() * (8000 - 2000 + 1)) + 2000; // Random between 2000-8000ms
}

// Sleep function for delay
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function scrapLinkedInProfile(
  unipileApiKey: string, 
  authorProfileId: string
): Promise<UnipileScrapingResult> {
  console.log('Starting Unipile profile scraping');
  
  if (!authorProfileId) {
    console.log('No author_profile_id available for Unipile scraping');
    return { company: null, position: null, success: false };
  }

  try {
    // Add random delay before making the API call
    const delayMs = getRandomDelay();
    console.log(`Adding random delay of ${delayMs}ms before Unipile API call`);
    await sleep(delayMs);

    const unipileResponse = await fetch(
      `https://api9.unipile.com:13946/api/v1/users/${authorProfileId}?account_id=DdxglDwFT-mMZgxHeCGMdA&linkedin_sections=experience`, 
      {
        method: 'GET',
        headers: {
          'X-API-KEY': unipileApiKey,
          'accept': 'application/json'
        }
      }
    );

    if (unipileResponse.ok) {
      const unipileData = await unipileResponse.json();
      console.log('Unipile response received:', unipileData);

      // Extract company and position from current work experience (most recent with no end date)
      let company = null;
      let position = null;
      
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
          
          console.log('Selected current experience:', {
            company,
            position,
            company_id: currentExperience.company_id,
            isCurrentPosition: !currentExperience.end,
            startDate: currentExperience.start,
            endDate: currentExperience.end
          });
        }
      } else {
        console.log('No work experience found in the response');
      }

      console.log('Unipile data extracted:', { company, position });
      return { company, position, success: true };
    } else {
      console.error('Unipile API error:', unipileResponse.status, await unipileResponse.text());
      return { company: null, position: null, success: false };
    }
  } catch (unipileError) {
    console.error('Error calling Unipile API:', unipileError);
    return { company: null, position: null, success: false };
  }
}

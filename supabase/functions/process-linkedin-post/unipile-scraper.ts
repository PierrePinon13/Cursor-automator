
export interface UnipileScrapingResult {
  company: string | null;
  position: string | null;
  success: boolean;
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

      // Extract company and position from first work experience
      let company = null;
      let position = null;
      
      if (unipileData.linkedin_profile?.experience && unipileData.linkedin_profile.experience.length > 0) {
        const firstExperience = unipileData.linkedin_profile.experience[0];
        company = firstExperience.company || null;
        position = firstExperience.title || null;
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

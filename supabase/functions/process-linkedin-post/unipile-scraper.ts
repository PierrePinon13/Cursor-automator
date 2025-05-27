
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
  console.log('Starting Unipile profile scraping with fixed account ID');
  
  if (!authorProfileId) {
    console.log('No author_profile_id available for Unipile scraping');
    return { company: null, position: null, company_id: null, provider_id: null, success: false };
  }

  try {
    console.log('Scraping profile with ID:', authorProfileId);
    
    // Utiliser l'account ID fixe et l'API Unipile directe
    const unipileUrl = `https://api9.unipile.com:13946/api/v1/users/${authorProfileId}?account_id=DdxglDwFT-mMZgxHeCGMdA`;
    
    console.log('Calling Unipile API:', unipileUrl);
    
    const response = await fetch(unipileUrl, {
      method: 'GET',
      headers: {
        'X-API-KEY': unipileApiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log('Unipile API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Unipile API error:', response.status, errorText);
      return { company: null, position: null, company_id: null, provider_id: null, success: false };
    }

    const unipileData = await response.json();
    console.log('🔍 UNIPILE RAW RESPONSE:', JSON.stringify(unipileData, null, 2));

    // Extract company, position, company_id and provider_id from response
    let company = null;
    let position = null;
    let company_id = null;
    let provider_id = null;
    
    // Get provider_id from the main profile data
    provider_id = unipileData.provider_id || unipileData.publicIdentifier || unipileData.linkedin_profile?.publicIdentifier || null;
    console.log('📱 Provider ID extracted:', provider_id);
    
    // Log available top-level keys for debugging
    console.log('🔑 Available top-level keys in unipileData:', Object.keys(unipileData));
    
    // Check both work_experience and linkedin_profile.experience structures
    let experiences = null;
    
    if (unipileData.work_experience) {
      experiences = unipileData.work_experience;
      console.log('📊 Found work_experience structure with', experiences.length, 'experiences');
    } else if (unipileData.linkedin_profile?.experience) {
      experiences = unipileData.linkedin_profile.experience;
      console.log('📊 Found linkedin_profile.experience structure with', experiences.length, 'experiences');
    } else {
      console.log('❌ No work experience found in any expected structure');
      console.log('🔍 Checking if linkedin_profile exists:', !!unipileData.linkedin_profile);
      if (unipileData.linkedin_profile) {
        console.log('🔑 Available keys in linkedin_profile:', Object.keys(unipileData.linkedin_profile));
      }
    }
    
    if (experiences && experiences.length > 0) {
      console.log('🏢 Processing work experiences. Total count:', experiences.length);
      
      // Log all experiences for debugging
      experiences.forEach((exp: any, index: number) => {
        console.log(`📋 Experience ${index}:`, {
          company: exp.company,
          companyName: exp.companyName,
          title: exp.title,
          position: exp.position,
          company_id: exp.company_id,
          companyId: exp.companyId,
          start: exp.start,
          end: exp.end,
          isCurrent: !exp.end || exp.end === null || exp.end === '',
          allKeys: Object.keys(exp)
        });
      });
      
      // Find current position (no end date or end is null)
      let currentExperience = experiences.find((exp: any) => 
        !exp.end || exp.end === null || exp.end === ''
      );
      
      // If no current position found, take the most recent one (first in array)
      if (!currentExperience) {
        currentExperience = experiences[0];
        console.log('⚠️ No current experience found, using most recent (index 0)');
      } else {
        console.log('✅ Found current experience');
      }
      
      if (currentExperience) {
        // Try multiple possible property names for company
        company = currentExperience.company || 
                 currentExperience.companyName || 
                 currentExperience.company_name || 
                 null;
        
        // Try multiple possible property names for position
        position = currentExperience.position || 
                  currentExperience.title || 
                  currentExperience.jobTitle || 
                  currentExperience.job_title ||
                  null;
        
        // Try multiple possible property names for company_id
        company_id = currentExperience.company_id || 
                    currentExperience.companyId || 
                    currentExperience.company_linkedin_id ||
                    null;
        
        console.log('🎯 EXTRACTED DATA:', {
          company,
          position,
          company_id,
          isCurrentPosition: !currentExperience.end,
          startDate: currentExperience.start,
          endDate: currentExperience.end,
          experienceIndex: experiences.indexOf(currentExperience)
        });
      }
    } else {
      console.log('❌ No work experience found or experiences array is empty');
    }

    const result = { company, position, company_id, provider_id, success: true };
    console.log('🏁 FINAL UNIPILE RESULT:', result);
    return result;

  } catch (unipileError) {
    console.error('💥 Error calling Unipile API:', unipileError);
    return { company: null, position: null, company_id: null, provider_id: null, success: false };
  }
}

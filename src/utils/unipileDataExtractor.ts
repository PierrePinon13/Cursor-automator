
export interface WorkExperience {
  company: string;
  position: string;
  start?: string;
  end?: string;
  isCurrent: boolean;
  company_id?: string;
}

export function extractWorkExperiences(unipileResponse: any): WorkExperience[] {
  if (!unipileResponse) {
    return [];
  }

  // Check both work_experience and linkedin_profile.experience structures
  const experiences = unipileResponse.work_experience || unipileResponse.linkedin_profile?.experience || [];
  
  if (!Array.isArray(experiences)) {
    return [];
  }

  return experiences.map((exp: any) => ({
    company: exp.company || '',
    position: exp.position || exp.title || '',
    start: exp.start || '',
    end: exp.end || '',
    isCurrent: !exp.end || exp.end === null || exp.end === '',
    company_id: exp.company_id || null
  })).filter((exp: WorkExperience) => exp.company); // Only keep experiences with company names
}

export function getLastThreeCompanies(unipileResponse: any): string[] {
  const experiences = extractWorkExperiences(unipileResponse);
  return experiences
    .slice(0, 3) // Take first 3 (most recent)
    .map(exp => exp.company);
}

export function getCurrentCompanyLinkedInId(unipileResponse: any): string | null {
  const experiences = extractWorkExperiences(unipileResponse);
  const currentExperience = experiences.find(exp => exp.isCurrent);
  return currentExperience?.company_id || null;
}

export function getLinkedInProviderId(unipileResponse: any): string | null {
  if (!unipileResponse) {
    return null;
  }
  
  return unipileResponse.provider_id || 
         unipileResponse.publicIdentifier || 
         unipileResponse.linkedin_profile?.publicIdentifier || 
         null;
}

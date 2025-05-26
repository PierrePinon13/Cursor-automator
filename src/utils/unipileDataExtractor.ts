
export interface WorkExperience {
  company: string;
  position: string;
  start?: string;
  end?: string;
  isCurrent: boolean;
}

export function extractWorkExperiences(unipileResponse: any): WorkExperience[] {
  if (!unipileResponse) {
    return [];
  }

  // Check both linkedin_profile.experience and work_experience structures
  const experiences = unipileResponse.linkedin_profile?.experience || unipileResponse.work_experience || [];
  
  if (!Array.isArray(experiences)) {
    return [];
  }

  return experiences.map((exp: any) => ({
    company: exp.company || '',
    position: exp.position || exp.title || '',
    start: exp.start || '',
    end: exp.end || '',
    isCurrent: !exp.end || exp.end === null || exp.end === ''
  })).filter((exp: WorkExperience) => exp.company); // Only keep experiences with company names
}

export function getLastThreeCompanies(unipileResponse: any): string[] {
  const experiences = extractWorkExperiences(unipileResponse);
  return experiences
    .slice(0, 3) // Take first 3 (most recent)
    .map(exp => exp.company);
}

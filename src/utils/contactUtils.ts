
export interface Persona {
  id: string;
  name: string;
  title: string;
  profileUrl: string;
  company?: string;
  linkedin_id?: string;
  jobTitle?: string;
  jobCompany?: string;
}

export interface JobResult {
  title: string;
  company: string;
  personas?: any[];
}

export const extractUniqueContacts = (searchResults: JobResult[]): Persona[] => {
  // Collecter tous les contacts de tous les jobs
  const allContacts: Persona[] = searchResults.flatMap(job => 
    job.personas?.map((persona: any) => ({
      ...persona,
      jobTitle: job.title,
      jobCompany: job.company
    })) || []
  );

  // Dédupliquer les contacts par profileUrl
  return allContacts.reduce((acc, contact) => {
    const existing = acc.find(c => c.profileUrl === contact.profileUrl);
    if (!existing) {
      acc.push(contact);
    }
    return acc;
  }, [] as Persona[]);
};

export const buildBulkProspectingUrl = (
  searchName: string, 
  contacts: Persona[]
): string => {
  const params = new URLSearchParams({
    searchName: encodeURIComponent(searchName),
    jobTitle: encodeURIComponent('Recherche groupée'),
    companyName: encodeURIComponent(searchName),
    contacts: encodeURIComponent(JSON.stringify(contacts))
  });

  return `/bulk-prospecting?${params.toString()}`;
};

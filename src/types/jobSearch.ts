
export interface Persona {
  id: string;
  name: string;
  title: string;
  company: string;
  profile_url: string;
  location?: string;
  jobTitle?: string;
  jobCompany?: string;
  jobId?: string;
}

export interface JobSearchResult {
  id: string;
  job_id: string;
  job_title: string;
  company_name: string;
  company_id?: string;
  job_description?: string;
  job_url?: string;
  company_logo?: string;
  location?: string;
  posted_date?: string;
  personas?: Persona[];
  personnas_searched?: boolean;
  search_id: string;
  created_at: string;
  updated_at: string;
}

export interface JobData {
  id: string;
  title: string;
  company: string;
  personas: Persona[];
}

export interface SavedSearch {
  id: string;
  name: string;
  jobFilters: any;
  personaFilters: any;
  messageTemplate?: string;
  createdAt: Date;
  lastExecuted?: Date;
  resultsCount?: number;
}

export interface BulkProspectingState {
  selectedPersonas: Persona[];
  messageTemplate: string;
  personalizedMessages: { [personaId: string]: string };
}

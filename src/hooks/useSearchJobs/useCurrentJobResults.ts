
import { useState } from 'react';

export interface JobResult {
  id: string;
  title: string;
  company: string;
  location: string;
  postedDate: Date;
  description: string;
  jobUrl?: string;
  salary?: string;
  personas: Array<any>;
}

export function useCurrentJobResults() {
  const [currentResults, setCurrentResults] = useState<JobResult[]>([]);
  const [currentSearchId, setCurrentSearchId] = useState<string | null>(null);

  return {
    currentResults, setCurrentResults,
    currentSearchId, setCurrentSearchId
  };
}

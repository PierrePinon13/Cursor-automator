
import { useState, useEffect } from 'react';

export interface JobResult {
  id: string;
  title: string;
  company: string;
  location: string;
  postedDate: Date;
  description: string;
  jobUrl?: string;
  company_logo?: string;
  personas: Array<{
    id: string;
    name: string;
    title: string;
    profileUrl: string;
    company?: string;
  }>;
}

export function useCurrentJobResults() {
  const [currentResults, setCurrentResults] = useState<JobResult[]>([]);
  const [currentSearchId, setCurrentSearchId] = useState<string | null>(null);

  // Hack global pour permettre le reset depuis d'autres composants
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).lovableJobResultsHack = setCurrentResults;
    }
  }, []);

  // Écouter les mises à jour en temps réel des personas
  useEffect(() => {
    if (!currentSearchId) return;
    
    const handlePersonaUpdate = () => {
      // Force le rechargement des résultats pour cette recherche
      const event = new CustomEvent('reload-job-results', { detail: { searchId: currentSearchId } });
      window.dispatchEvent(event);
    };

    // Écouter les mises à jour de personas
    window.addEventListener('persona-update', handlePersonaUpdate);
    
    return () => {
      window.removeEventListener('persona-update', handlePersonaUpdate);
    };
  }, [currentSearchId]);

  return {
    currentResults,
    setCurrentResults,
    currentSearchId,
    setCurrentSearchId,
  };
}

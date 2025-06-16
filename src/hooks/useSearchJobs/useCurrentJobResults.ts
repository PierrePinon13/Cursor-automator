
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
    
    const handlePersonaUpdate = (event: CustomEvent) => {
      console.log('🔄 Persona update event received:', event.detail);
      // Force le rechargement des résultats pour cette recherche
      const reloadEvent = new CustomEvent('reload-job-results', { 
        detail: { searchId: currentSearchId } 
      });
      window.dispatchEvent(reloadEvent);
    };

    // Écouter les mises à jour de personas avec le bon type d'événement
    window.addEventListener('persona-update', handlePersonaUpdate as EventListener);
    
    // Polling toutes les 5 secondes pour s'assurer que les données sont à jour
    const pollInterval = setInterval(() => {
      if (currentSearchId) {
        console.log('🔄 Polling for persona updates...', currentSearchId);
        const reloadEvent = new CustomEvent('reload-job-results', { 
          detail: { searchId: currentSearchId } 
        });
        window.dispatchEvent(reloadEvent);
      }
    }, 5000);
    
    return () => {
      window.removeEventListener('persona-update', handlePersonaUpdate as EventListener);
      clearInterval(pollInterval);
    };
  }, [currentSearchId]);

  return {
    currentResults,
    setCurrentResults,
    currentSearchId,
    setCurrentSearchId,
  };
}

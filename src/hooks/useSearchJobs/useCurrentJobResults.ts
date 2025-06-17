
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
  messageTemplate?: string; // Ajouter le template de message
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

  // Wrapper pour setCurrentResults avec logging
  const setCurrentResultsWithLogging = (results: JobResult[] | ((prev: JobResult[]) => JobResult[])) => {
    console.log('🔄 setCurrentResults called with:', typeof results === 'function' ? 'function' : results);
    
    if (typeof results === 'function') {
      setCurrentResults(prev => {
        const newResults = results(prev);
        console.log('🔄 Function result:', newResults.map(r => ({ title: r.title, personas: r.personas.length })));
        return newResults;
      });
    } else {
      console.log('🔄 Direct results:', results.map(r => ({ title: r.title, personas: r.personas.length })));
      setCurrentResults(results);
    }
  };

  // Écouter les mises à jour en temps réel des personas avec polling plus agressif
  useEffect(() => {
    if (!currentSearchId) return;
    
    console.log('🔄 Setting up persona update listeners for search:', currentSearchId);
    
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
    
    // Polling plus fréquent toutes les 3 secondes
    const pollInterval = setInterval(() => {
      if (currentSearchId) {
        console.log('🔄 Polling for persona updates...', currentSearchId);
        const reloadEvent = new CustomEvent('reload-job-results', { 
          detail: { searchId: currentSearchId } 
        });
        window.dispatchEvent(reloadEvent);
      }
    }, 3000); // Réduire à 3 secondes
    
    return () => {
      console.log('🔄 Cleaning up persona update listeners for search:', currentSearchId);
      window.removeEventListener('persona-update', handlePersonaUpdate as EventListener);
      clearInterval(pollInterval);
    };
  }, [currentSearchId]);

  // Logging pour les changements de state
  useEffect(() => {
    console.log('📊 Current results state changed:', currentResults.map(r => ({ 
      title: r.title, 
      personas: r.personas.length,
      personaNames: r.personas.map(p => p.name)
    })));
  }, [currentResults]);

  useEffect(() => {
    console.log('🔍 Current search ID changed:', currentSearchId);
  }, [currentSearchId]);

  return {
    currentResults,
    setCurrentResults: setCurrentResultsWithLogging,
    currentSearchId,
    setCurrentSearchId,
  };
}

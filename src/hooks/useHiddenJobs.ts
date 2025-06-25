
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PersonaSelection {
  personaId: string;
  searchId: string;
  jobId: string;
  status: 'selected' | 'removed' | 'duplicate_validated';
  selectedJobId?: string; // Pour les doublons validés
  createdAt: string;
}

export const useHiddenJobs = () => {
  const [hiddenJobs, setHiddenJobs] = useState<Set<string>>(new Set());

  // Charger les jobs cachées depuis le localStorage au démarrage
  useEffect(() => {
    const saved = localStorage.getItem('hiddenJobs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHiddenJobs(new Set(parsed));
      } catch (error) {
        console.error('Erreur lors du chargement des jobs cachées:', error);
      }
    }
  }, []);

  // Sauvegarder dans le localStorage à chaque changement
  useEffect(() => {
    localStorage.setItem('hiddenJobs', JSON.stringify(Array.from(hiddenJobs)));
  }, [hiddenJobs]);

  const hideJob = (jobId: string) => {
    setHiddenJobs(prev => new Set([...prev, jobId]));
  };

  const showJob = (jobId: string) => {
    setHiddenJobs(prev => {
      const newSet = new Set(prev);
      newSet.delete(jobId);
      return newSet;
    });
  };

  const showAllJobs = () => {
    setHiddenJobs(new Set());
  };

  const isJobHidden = (jobId: string) => {
    return hiddenJobs.has(jobId);
  };

  return {
    hiddenJobs,
    hideJob,
    showJob,
    showAllJobs,
    isJobHidden
  };
};

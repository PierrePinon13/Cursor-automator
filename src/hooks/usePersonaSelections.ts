
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PersonaSelection {
  persona_id: string;
  search_id: string;
  job_id: string;
  status: 'selected' | 'removed' | 'duplicate_validated';
  selected_job_id?: string;
  created_at: string;
  updated_at: string;
}

export const usePersonaSelections = (searchId: string) => {
  const [selections, setSelections] = useState<PersonaSelection[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les sélections depuis la base de données
  useEffect(() => {
    const loadSelections = async () => {
      if (!searchId) return;
      
      try {
        const { data, error } = await supabase
          .from('persona_selections')
          .select('*')
          .eq('search_id', searchId);

        if (error) {
          console.error('Erreur lors du chargement des sélections:', error);
        } else {
          setSelections(data || []);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des sélections:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSelections();
  }, [searchId]);

  const updatePersonaStatus = async (
    personaId: string,
    jobId: string,
    status: 'selected' | 'removed' | 'duplicate_validated',
    selectedJobId?: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('persona_selections')
        .upsert({
          persona_id: personaId,
          search_id: searchId,
          job_id: jobId,
          status,
          selected_job_id: selectedJobId,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'persona_id,search_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Erreur lors de la mise à jour:', error);
        return false;
      }

      // Mettre à jour le state local
      setSelections(prev => {
        const filtered = prev.filter(s => !(s.persona_id === personaId && s.search_id === searchId));
        return [...filtered, data];
      });

      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      return false;
    }
  };

  const getPersonaStatus = (personaId: string, jobId?: string) => {
    const selection = selections.find(s => 
      s.persona_id === personaId && 
      s.search_id === searchId &&
      (!jobId || s.job_id === jobId)
    );
    return selection?.status;
  };

  const getSelectedJobId = (personaId: string) => {
    const selection = selections.find(s => 
      s.persona_id === personaId && 
      s.search_id === searchId &&
      s.status === 'duplicate_validated'
    );
    return selection?.selected_job_id;
  };

  const isPersonaRemoved = (personaId: string, jobId?: string) => {
    return getPersonaStatus(personaId, jobId) === 'removed';
  };

  const isPersonaSelected = (personaId: string, jobId?: string) => {
    return getPersonaStatus(personaId, jobId) === 'selected';
  };

  const isDuplicateValidated = (personaId: string) => {
    return getPersonaStatus(personaId) === 'duplicate_validated';
  };

  return {
    selections,
    loading,
    updatePersonaStatus,
    getPersonaStatus,
    getSelectedJobId,
    isPersonaRemoved,
    isPersonaSelected,
    isDuplicateValidated
  };
};

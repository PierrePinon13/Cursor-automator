
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WorkExperience {
  id: string;
  contact_id: string;
  company_name: string;
  position: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  duration_months: number | null;
  company_linkedin_id: string | null;
  created_at: string;
}

export const useContactWorkHistory = (contactId: string) => {
  const [workHistory, setWorkHistory] = useState<WorkExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchWorkHistory = async () => {
    if (!contactId) return;
    
    try {
      const { data, error } = await supabase
        .from('contact_work_history')
        .select('*')
        .eq('contact_id', contactId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setWorkHistory(data || []);
    } catch (error) {
      console.error('Error fetching work history:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique professionnel.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveWorkHistory = async (experiences: Partial<WorkExperience>[]) => {
    if (!contactId || !experiences.length) return;

    try {
      // Supprimer l'historique existant
      await supabase
        .from('contact_work_history')
        .delete()
        .eq('contact_id', contactId);

      // Insérer le nouvel historique
      const { error } = await supabase
        .from('contact_work_history')
        .insert(
          experiences.map(exp => ({
            contact_id: contactId,
            company_name: exp.company_name,
            position: exp.position,
            start_date: exp.start_date,
            end_date: exp.end_date,
            is_current: exp.is_current || false,
            duration_months: exp.duration_months,
            company_linkedin_id: exp.company_linkedin_id
          }))
        );

      if (error) throw error;
      
      await fetchWorkHistory();
      
      toast({
        title: "Succès",
        description: "Historique professionnel sauvegardé.",
      });
    } catch (error) {
      console.error('Error saving work history:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'historique professionnel.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchWorkHistory();
  }, [contactId]);

  return {
    workHistory,
    loading,
    saveWorkHistory,
    refreshWorkHistory: fetchWorkHistory
  };
};

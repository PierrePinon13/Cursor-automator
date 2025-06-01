
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreateReminderParams {
  type: string;
  target_user_id: string;
  lead_id: string;
  title: string;
  message: string;
  due_date: string;
}

export const useReminders = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createReminder = async (params: CreateReminderParams) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reminders')
        .insert({
          type: params.type,
          target_user_id: params.target_user_id,
          lead_id: params.lead_id,
          title: params.title,
          message: params.message,
          due_date: params.due_date,
          creator_user_id: params.target_user_id // Pour l'instant, le créateur est le même que la cible
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Rappel créé avec succès",
      });

      return data;
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le rappel",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    createReminder,
    loading
  };
};

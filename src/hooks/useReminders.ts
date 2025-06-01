
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface Reminder {
  id: string;
  type: string;
  target_user_id: string;
  lead_id: string;
  title: string;
  message: string;
  due_date: string | null;
  creator_user_id: string;
  created_at: string;
  updated_at: string;
  read: boolean;
  lead_data?: {
    author_name?: string;
    company_position?: string;
  };
  creator_name?: string;
}

interface CreateReminderParams {
  type: string;
  target_user_id: string;
  lead_id: string;
  title: string;
  message: string;
  due_date: string;
}

export const useReminders = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchReminders = async () => {
    if (!user) return;

    try {
      // Récupérer les rappels
      const { data: remindersData, error: remindersError } = await supabase
        .from('reminders')
        .select('*')
        .eq('target_user_id', user.id)
        .order('created_at', { ascending: false });

      if (remindersError) throw remindersError;

      // Récupérer les données des leads séparément
      const leadIds = remindersData?.map(r => r.lead_id) || [];
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('id, author_name, company_position')
        .in('id', leadIds);

      if (leadsError) throw leadsError;

      // Récupérer les noms des créateurs séparément
      const creatorIds = remindersData?.map(r => r.creator_user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', creatorIds);

      if (profilesError) throw profilesError;

      // Combiner les données
      const formattedReminders = (remindersData || []).map(reminder => {
        const leadData = leadsData?.find(lead => lead.id === reminder.lead_id);
        const creatorProfile = profilesData?.find(profile => profile.id === reminder.creator_user_id);
        
        return {
          ...reminder,
          lead_data: leadData ? {
            author_name: leadData.author_name,
            company_position: leadData.company_position
          } : undefined,
          creator_name: creatorProfile?.full_name || 'Utilisateur inconnu'
        };
      });

      setReminders(formattedReminders);
      setUnreadCount(formattedReminders.filter(r => !r.read).length);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  };

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

      await fetchReminders();
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

  const markAsRead = async (reminderId: string) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ read: true })
        .eq('id', reminderId);

      if (error) throw error;

      setReminders(prev => 
        prev.map(r => r.id === reminderId ? { ...r, read: true } : r)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking reminder as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('reminders')
        .update({ read: true })
        .eq('target_user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      setReminders(prev => prev.map(r => ({ ...r, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all reminders as read:', error);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [user]);

  return {
    reminders,
    unreadCount,
    loading,
    createReminder,
    markAsRead,
    markAllAsRead,
    refreshReminders: fetchReminders
  };
};

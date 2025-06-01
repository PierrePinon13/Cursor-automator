
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
      const { data, error } = await supabase
        .from('reminders')
        .select(`
          *,
          lead_data:leads!reminders_lead_id_fkey(author_name, company_position),
          creator_profiles:profiles!reminders_creator_user_id_fkey(full_name)
        `)
        .eq('target_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedReminders = (data || []).map(reminder => ({
        ...reminder,
        creator_name: reminder.creator_profiles?.full_name || 'Utilisateur inconnu'
      }));

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


import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Reminder {
  id: string;
  type: 'lead_assigned' | 'reminder_due';
  target_user_id: string;
  creator_user_id: string;
  lead_id: string;
  title: string;
  message: string;
  read: boolean;
  due_date?: string;
  created_at: string;
  updated_at: string;
  lead_data?: any;
  creator_name?: string;
}

export const useReminders = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchReminders = async () => {
    if (!user) return;

    setLoading(true);
    try {
      console.log('🔔 Fetching reminders for user:', user.id);
      
      const { data: remindersData, error } = await supabase
        .from('reminders')
        .select(`
          *,
          lead:leads(
            id,
            author_name,
            author_headline,
            author_profile_url,
            company_name,
            company_position,
            matched_client_name,
            latest_post_urn,
            latest_post_url
          )
        `)
        .eq('target_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching reminders:', error);
        return;
      }

      console.log('📋 Reminders data:', remindersData);

      if (!remindersData || remindersData.length === 0) {
        console.log('⚠️ No reminders found');
        setReminders([]);
        setUnreadCount(0);
        return;
      }

      // Enrichir avec les noms des créateurs
      const userIds = [...new Set(remindersData.map(r => r.creator_user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profilesMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

      const enrichedReminders = remindersData.map((reminder: any) => ({
        ...reminder,
        lead_data: reminder.lead,
        creator_name: profilesMap.get(reminder.creator_user_id) || 'Utilisateur inconnu'
      }));

      setReminders(enrichedReminders);
      setUnreadCount(enrichedReminders.filter(r => !r.read).length);

    } catch (error) {
      console.error('💥 Unexpected error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (reminderId: string) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ read: true })
        .eq('id', reminderId)
        .eq('target_user_id', user?.id);

      if (error) throw error;

      setReminders(prev => 
        prev.map(r => 
          r.id === reminderId ? { ...r, read: true } : r
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking reminder as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ read: true })
        .eq('target_user_id', user?.id)
        .eq('read', false);

      if (error) throw error;

      setReminders(prev => prev.map(r => ({ ...r, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all reminders as read:', error);
    }
  };

  const createReminder = async (reminderData: {
    type: 'lead_assigned' | 'reminder_due';
    target_user_id: string;
    lead_id: string;
    title: string;
    message: string;
    due_date?: string;
  }) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('reminders')
        .insert({
          type: reminderData.type,
          target_user_id: reminderData.target_user_id,
          creator_user_id: user.id,
          lead_id: reminderData.lead_id,
          title: reminderData.title,
          message: reminderData.message,
          due_date: reminderData.due_date
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error creating reminder:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchReminders();
    
    // Set up real-time subscription for reminders
    const channel = supabase
      .channel('reminders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reminders',
          filter: `target_user_id=eq.${user.id}`
        },
        () => {
          console.log('Reminder change detected, refreshing...');
          fetchReminders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    reminders,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    createReminder,
    refreshReminders: fetchReminders
  };
};

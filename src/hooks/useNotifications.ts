
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Notification {
  id: string;
  type: 'lead_assigned' | 'reminder_due' | 'linkedin_message' | 'phone_call';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  lead_id?: string;
  client_name?: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    console.log('useNotifications - fetching for user:', user.id);
    fetchNotifications();
    
    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New notification received:', payload);
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      console.log('Fetching notifications for user:', user.id);
      
      const mockNotifications: Notification[] = [];

      // Récupérer les assignations récentes
      const { data: assignments } = await supabase
        .from('lead_assignments')
        .select(`
          id,
          lead_id,
          assigned_at,
          linkedin_posts!inner (
            author_name,
            matched_client_name
          )
        `)
        .eq('user_id', user.id)
        .order('assigned_at', { ascending: false })
        .limit(5);

      if (assignments) {
        assignments.forEach(assignment => {
          mockNotifications.push({
            id: `assignment-${assignment.id}`,
            type: 'lead_assigned',
            title: 'Nouveau lead assigné',
            message: `Un lead de ${assignment.linkedin_posts.author_name} vous a été assigné`,
            read: false,
            created_at: assignment.assigned_at,
            lead_id: assignment.lead_id,
            client_name: assignment.linkedin_posts.matched_client_name
          });
        });
      }

      // Récupérer les activités récentes (messages LinkedIn envoyés)
      const { data: recentMessages } = await supabase
        .from('linkedin_posts')
        .select('id, author_name, linkedin_message_sent_at, unipile_position')
        .not('linkedin_message_sent_at', 'is', null)
        .gte('linkedin_message_sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('linkedin_message_sent_at', { ascending: false })
        .limit(10);

      if (recentMessages) {
        recentMessages.forEach(message => {
          mockNotifications.push({
            id: `linkedin-${message.id}`,
            type: 'linkedin_message',
            title: 'Message LinkedIn envoyé',
            message: `Message envoyé à ${message.author_name}${message.unipile_position ? ` - ${message.unipile_position}` : ''}`,
            read: true, // Messages already sent, marked as read
            created_at: message.linkedin_message_sent_at,
            lead_id: message.id
          });
        });
      }

      // Récupérer les appels récents
      const { data: recentCalls } = await supabase
        .from('linkedin_posts')
        .select('id, author_name, phone_contact_at, phone_contact_status, unipile_position')
        .not('phone_contact_at', 'is', null)
        .gte('phone_contact_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('phone_contact_at', { ascending: false })
        .limit(10);

      if (recentCalls) {
        recentCalls.forEach(call => {
          mockNotifications.push({
            id: `call-${call.id}`,
            type: 'phone_call',
            title: `Appel ${call.phone_contact_status === 'positive' ? 'positif' : 'négatif'}`,
            message: `Appel avec ${call.author_name}${call.unipile_position ? ` - ${call.unipile_position}` : ''}`,
            read: true,
            created_at: call.phone_contact_at,
            lead_id: call.id
          });
        });
      }

      // Trier par date décroissante
      mockNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      console.log('Notifications fetched:', mockNotifications.length);
      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refreshNotifications: fetchNotifications
  };
};

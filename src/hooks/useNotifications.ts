
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
  lead_data?: any;
  sender_name?: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    fetchNotifications();
    
    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activities'
        },
        (payload) => {
          console.log('New activity received:', payload);
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
      const mockNotifications: Notification[] = [];

      // Récupérer les assignations récentes
      const { data: assignments } = await supabase
        .from('lead_assignments')
        .select(`
          id,
          lead_id,
          assigned_at,
          leads!inner (
            id,
            author_name,
            matched_client_name,
            author_profile_url,
            author_headline,
            company_name,
            company_position
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
            message: `Un lead de ${assignment.leads.author_name} vous a été assigné`,
            read: false,
            created_at: assignment.assigned_at,
            lead_id: assignment.lead_id,
            client_name: assignment.leads.matched_client_name,
            lead_data: assignment.leads
          });
        });
      }

      // Récupérer les activités récentes depuis la nouvelle table activities
      try {
        const { data: recentActivities, error: activitiesError } = await supabase
          .from('activities' as any)
          .select(`
            *,
            lead:leads (
              id,
              author_name,
              author_headline,
              author_profile_url,
              company_name,
              company_position,
              matched_client_name
            )
          `)
          .gte('performed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('performed_at', { ascending: false })
          .limit(30);

        console.log('Recent activities:', recentActivities, 'Error:', activitiesError);

        if (recentActivities && recentActivities.length > 0) {
          recentActivities.forEach(activity => {
            let title = '';
            let message = '';

            switch (activity.activity_type) {
              case 'linkedin_message':
                // Utiliser message_type pour différencier
                if (activity.activity_data?.message_type === 'connection_request') {
                  title = 'Demande de connexion LinkedIn';
                  message = `Connexion envoyée à ${activity.lead.author_name}`;
                } else {
                  title = 'Message LinkedIn envoyé';
                  message = `Message envoyé à ${activity.lead.author_name}${activity.lead.company_position ? ` - ${activity.lead.company_position}` : ''}`;
                }
                break;
              case 'phone_call':
                const statusText = activity.outcome === 'positive' ? 'positif' : 
                                  activity.outcome === 'negative' ? 'négatif' : 'neutre';
                title = `Appel ${statusText}`;
                message = `Appel ${statusText} avec ${activity.lead.author_name}${activity.lead.company_position ? ` - ${activity.lead.company_position}` : ''}`;
                break;
              case 'linkedin_connection':
                title = 'Demande de connexion LinkedIn';
                message = `Connexion envoyée à ${activity.lead.author_name}`;
                break;
            }

            mockNotifications.push({
              id: `activity-${activity.id}`,
              type: activity.activity_type as 'linkedin_message' | 'phone_call',
              title,
              message,
              read: true,
              created_at: activity.performed_at,
              lead_id: activity.lead_id,
              lead_data: {
                ...activity.lead,
                approach_message: activity.activity_type === 'linkedin_message' ? 
                  activity.activity_data?.message_content : undefined
              },
              sender_name: activity.performed_by_user_name || 'Utilisateur Inconnu'
            });
          });
        }
      } catch (activitiesError) {
        console.warn('Could not fetch activities for notifications:', activitiesError);
        // Continue sans les activités si la table n'est pas encore accessible
      }

      // Trier par date décroissante
      mockNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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

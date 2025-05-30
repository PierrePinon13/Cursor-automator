
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
    
    // Set up real-time subscription pour la nouvelle table activities
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
      const { data: assignments, error: assignmentsError } = await supabase
        .from('lead_assignments')
        .select('*')
        .eq('user_id', user.id)
        .order('assigned_at', { ascending: false })
        .limit(5);

      if (assignments && !assignmentsError) {
        const leadIds = assignments.map(a => a.lead_id);
        
        if (leadIds.length > 0) {
          const { data: leadsForAssignments } = await supabase
            .from('leads')
            .select('id, author_name, matched_client_name')
            .in('id', leadIds);

          const leadsMap = new Map((leadsForAssignments || []).map(lead => [lead.id, lead]));

          assignments.forEach(assignment => {
            const lead = leadsMap.get(assignment.lead_id);
            if (lead) {
              mockNotifications.push({
                id: `assignment-${assignment.id}`,
                type: 'lead_assigned',
                title: 'Nouveau lead assigné',
                message: `Un lead de ${lead.author_name} vous a été assigné`,
                read: false,
                created_at: assignment.assigned_at,
                lead_id: assignment.lead_id,
                client_name: lead.matched_client_name,
                lead_data: lead
              });
            }
          });
        }
      }

      // Récupérer les activités récentes depuis la nouvelle table activities
      try {
        const { data: recentActivities, error: activitiesError } = await supabase
          .from('activities')
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
          .gte('performed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('performed_at', { ascending: false })
          .limit(30);

        console.log('Recent activities:', recentActivities, 'Error:', activitiesError);

        if (recentActivities && Array.isArray(recentActivities) && recentActivities.length > 0) {
          recentActivities.forEach((activity: any) => {
            const lead = activity.lead;
            if (!lead) return;

            let title = '';
            let message = '';

            switch (activity.activity_type) {
              case 'linkedin_message':
                const messageData = activity.activity_data || {};
                const messageType = messageData.message_type || 'direct_message';
                const networkDistance = messageData.network_distance ? ` (${messageData.network_distance})` : '';
                
                if (messageType === 'connection_request') {
                  title = 'Demande de connexion LinkedIn envoyée';
                  message = `Demande de connexion envoyée à ${lead.author_name}${networkDistance}${lead.company_position ? ` - ${lead.company_position}` : ''}`;
                } else {
                  title = 'Message LinkedIn envoyé';
                  message = `Message direct envoyé à ${lead.author_name}${networkDistance}${lead.company_position ? ` - ${lead.company_position}` : ''}`;
                }
                break;
              case 'phone_call':
                const statusText = activity.outcome === 'positive' ? 'positif' : 
                                  activity.outcome === 'negative' ? 'négatif' : 'neutre';
                title = `Appel ${statusText}`;
                message = `Appel ${statusText} avec ${lead.author_name}${lead.company_position ? ` - ${lead.company_position}` : ''}`;
                break;
              case 'linkedin_connection':
                title = 'Demande de connexion LinkedIn';
                message = `Connexion envoyée à ${lead.author_name}`;
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
                ...lead,
                approach_message: activity.activity_type === 'linkedin_message' ? 
                  activity.activity_data?.message_content : undefined
              },
              sender_name: activity.performed_by_user_name || 'Utilisateur Inconnu'
            });
          });
        }
      } catch (activitiesError) {
        console.warn('Could not fetch activities for notifications:', activitiesError);
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

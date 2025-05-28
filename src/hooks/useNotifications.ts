
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
      const mockNotifications: Notification[] = [];

      // Récupérer les assignations récentes
      const { data: assignments } = await supabase
        .from('lead_assignments')
        .select(`
          id,
          lead_id,
          assigned_at,
          linkedin_posts!inner (
            id,
            author_name,
            matched_client_name,
            text,
            title,
            url,
            author_profile_url,
            author_headline,
            unipile_company,
            unipile_position,
            openai_step3_categorie,
            openai_step2_localisation,
            openai_step3_postes_selectionnes,
            posted_at_iso,
            created_at
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
            client_name: assignment.linkedin_posts.matched_client_name,
            lead_data: assignment.linkedin_posts
          });
        });
      }

      // Récupérer tous les messages LinkedIn récents (pas seulement ceux de l'utilisateur connecté)
      const { data: recentMessages } = await supabase
        .from('linkedin_messages')
        .select(`
          *,
          linkedin_posts!inner (
            id,
            author_name,
            author_headline,
            author_profile_url,
            unipile_company,
            unipile_position,
            openai_step3_categorie,
            openai_step2_localisation,
            openai_step3_postes_selectionnes,
            text,
            title,
            url,
            posted_at_iso,
            created_at,
            matched_client_name
          )
        `)
        .gte('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('sent_at', { ascending: false })
        .limit(20);

      if (recentMessages && recentMessages.length > 0) {
        // Récupérer tous les profils des expéditeurs uniques
        const uniqueUserIds = [...new Set(recentMessages.map(msg => msg.sent_by_user_id).filter(Boolean))];
        
        console.log('🔍 Unique sender IDs found:', uniqueUserIds);
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', uniqueUserIds);

        console.log('👤 Profiles found:', profiles);

        recentMessages.forEach(message => {
          const senderProfile = profiles?.find(p => p.id === message.sent_by_user_id);
          console.log(`📧 Message ${message.id} - Sender ID: ${message.sent_by_user_id} - Profile found:`, senderProfile);
          
          mockNotifications.push({
            id: `linkedin-${message.id}`,
            type: 'linkedin_message',
            title: 'Message LinkedIn envoyé',
            message: `Message envoyé à ${message.linkedin_posts.author_name}${message.linkedin_posts.unipile_position ? ` - ${message.linkedin_posts.unipile_position}` : ''}`,
            read: true,
            created_at: message.sent_at,
            lead_id: message.lead_id,
            lead_data: {
              ...message.linkedin_posts,
              approach_message: message.message_content
            },
            sender_name: senderProfile?.full_name || senderProfile?.email || 'Utilisateur Inconnu'
          });
        });
      }

      // Récupérer les appels récents avec toutes les données du lead
      const { data: recentCalls } = await supabase
        .from('linkedin_posts')
        .select('*')
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
            lead_id: call.id,
            lead_data: call
          });
        });
      }

      // Trier par date décroissante
      mockNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      console.log('✅ Final notifications with sender names:', mockNotifications);
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

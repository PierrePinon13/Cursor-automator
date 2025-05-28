
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LinkedInMessage {
  id: string;
  message_content: string;
  message_type: 'direct_message' | 'connection_request';
  sent_at: string;
  sender_name: string;
  sender_email: string;
  network_distance?: string;
  unipile_response?: any;
}

export const useLinkedInMessageHistory = (leadId: string) => {
  const [messages, setMessages] = useState<LinkedInMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!leadId) return;
    fetchMessageHistory();
  }, [leadId]);

  const fetchMessageHistory = async () => {
    setLoading(true);
    try {
      console.log('Fetching message history for lead:', leadId);
      
      const { data, error } = await supabase
        .from('linkedin_messages')
        .select(`
          id,
          message_content,
          message_type,
          sent_at,
          network_distance,
          unipile_response,
          sent_by_user_id
        `)
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true });

      if (error) {
        console.error('Error fetching message history:', error);
        return;
      }

      console.log('Raw messages data:', data);

      if (!data || data.length === 0) {
        console.log('No messages found for lead:', leadId);
        setMessages([]);
        return;
      }

      // Récupérer les profils des expéditeurs
      const userIds = [...new Set(data.map(msg => msg.sent_by_user_id).filter(Boolean))];
      console.log('User IDs to fetch profiles for:', userIds);

      if (userIds.length === 0) {
        console.log('No user IDs found, setting messages without sender names');
        const formattedMessages = data.map(msg => ({
          id: msg.id,
          message_content: msg.message_content,
          message_type: msg.message_type as 'direct_message' | 'connection_request',
          sent_at: msg.sent_at,
          sender_name: 'Utilisateur Inconnu',
          sender_email: '',
          network_distance: msg.network_distance,
          unipile_response: msg.unipile_response
        }));
        setMessages(formattedMessages);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      console.log('Profiles data:', profiles);

      const formattedMessages = data.map(msg => {
        const profile = profiles?.find(p => p.id === msg.sent_by_user_id);
        console.log(`Message ${msg.id}: sent_by_user_id=${msg.sent_by_user_id}, found profile:`, profile);
        
        return {
          id: msg.id,
          message_content: msg.message_content,
          message_type: msg.message_type as 'direct_message' | 'connection_request',
          sent_at: msg.sent_at,
          sender_name: profile?.full_name || profile?.email || 'Utilisateur Inconnu',
          sender_email: profile?.email || '',
          network_distance: msg.network_distance,
          unipile_response: msg.unipile_response
        };
      });

      console.log('Formatted messages:', formattedMessages);
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching message history:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    messages,
    loading,
    refreshHistory: fetchMessageHistory
  };
};

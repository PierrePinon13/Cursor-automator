
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

      // Récupérer les profils des expéditeurs
      const userIds = [...new Set(data.map(msg => msg.sent_by_user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const formattedMessages = data.map(msg => ({
        id: msg.id,
        message_content: msg.message_content,
        message_type: msg.message_type as 'direct_message' | 'connection_request',
        sent_at: msg.sent_at,
        sender_name: profiles?.find(p => p.id === msg.sent_by_user_id)?.full_name || 
                    profiles?.find(p => p.id === msg.sent_by_user_id)?.email || 
                    'Utilisateur Inconnu',
        sender_email: profiles?.find(p => p.id === msg.sent_by_user_id)?.email || '',
        network_distance: msg.network_distance,
        unipile_response: msg.unipile_response
      }));

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

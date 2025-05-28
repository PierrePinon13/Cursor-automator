
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
          profiles!inner (
            full_name,
            email
          )
        `)
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true });

      if (error) {
        console.error('Error fetching message history:', error);
        return;
      }

      const formattedMessages = data.map(msg => ({
        id: msg.id,
        message_content: msg.message_content,
        message_type: msg.message_type,
        sent_at: msg.sent_at,
        sender_name: msg.profiles.full_name || msg.profiles.email,
        sender_email: msg.profiles.email,
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

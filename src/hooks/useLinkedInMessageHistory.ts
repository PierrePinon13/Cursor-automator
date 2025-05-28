
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
      console.log('🔍 Fetching message history for lead:', leadId);
      
      const { data, error } = await supabase
        .from('linkedin_messages')
        .select(`
          id,
          message_content,
          message_type,
          sent_at,
          network_distance,
          unipile_response,
          sender_id,
          sender_full_name
        `)
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching message history:', error);
        return;
      }

      console.log('📋 Raw messages data:', data);
      console.log('📊 Number of messages found:', data?.length || 0);

      if (!data || data.length === 0) {
        console.log('⚠️ No messages found for lead:', leadId);
        setMessages([]);
        return;
      }

      const formattedMessages = data.map((msg, index) => {
        console.log(`📝 Message ${index + 1}:`, {
          id: msg.id,
          sender_full_name: msg.sender_full_name,
          message_preview: msg.message_content.substring(0, 50) + '...',
          sent_at: msg.sent_at
        });
        
        return {
          id: msg.id,
          message_content: msg.message_content,
          message_type: msg.message_type as 'direct_message' | 'connection_request',
          sent_at: msg.sent_at,
          sender_name: msg.sender_full_name || 'Utilisateur Inconnu',
          sender_email: '', // Plus besoin de l'email maintenant
          network_distance: msg.network_distance,
          unipile_response: msg.unipile_response
        };
      });

      console.log('✅ Final formatted messages:', formattedMessages);
      setMessages(formattedMessages);
    } catch (error) {
      console.error('💥 Unexpected error fetching message history:', error);
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


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

interface ActivityData {
  message_content?: string;
  message_type?: 'direct_message' | 'connection_request';
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
      
      // Récupérer les messages depuis la table activities avec une clé étrangère explicite
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('lead_id', leadId)
        .eq('activity_type', 'linkedin_message')
        .order('performed_at', { ascending: true });

      if (activitiesError) {
        console.error('❌ Error fetching activities:', activitiesError);
        setMessages([]);
        return;
      }

      console.log('📋 Activities data:', activitiesData);
      console.log('📊 Number of activities found:', activitiesData?.length || 0);

      if (!activitiesData || activitiesData.length === 0) {
        console.log('⚠️ No activities found for lead:', leadId);
        
        // Fallback : essayer de récupérer depuis l'ancienne table linkedin_messages
        const { data: linkedinMessagesData, error: linkedinError } = await supabase
          .from('linkedin_messages')
          .select('*')
          .eq('lead_id', leadId)
          .order('sent_at', { ascending: true });

        if (linkedinError) {
          console.error('❌ Error fetching linkedin_messages:', linkedinError);
          setMessages([]);
          return;
        }

        if (linkedinMessagesData && linkedinMessagesData.length > 0) {
          const formattedMessages = linkedinMessagesData.map((msg, index) => {
            console.log(`📝 LinkedIn Message ${index + 1}:`, {
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
              sender_email: '',
              network_distance: msg.network_distance,
              unipile_response: msg.unipile_response
            };
          });

          console.log('✅ Final formatted linkedin messages:', formattedMessages);
          setMessages(formattedMessages);
          return;
        }

        setMessages([]);
        return;
      }

      const formattedMessages = activitiesData.map((activity, index) => {
        console.log(`📝 Activity ${index + 1}:`, {
          id: activity.id,
          performed_by_user_name: activity.performed_by_user_name,
          message_preview: activity.activity_data && typeof activity.activity_data === 'object' && activity.activity_data !== null ? 
            (activity.activity_data as ActivityData).message_content?.substring(0, 50) + '...' : 'No message content',
          performed_at: activity.performed_at
        });
        
        const activityData = activity.activity_data && typeof activity.activity_data === 'object' && activity.activity_data !== null ? 
          activity.activity_data as ActivityData : {};
        
        return {
          id: activity.id,
          message_content: activityData.message_content || '',
          message_type: activityData.message_type as 'direct_message' | 'connection_request' || 'direct_message',
          sent_at: activity.performed_at,
          sender_name: activity.performed_by_user_name || 'Utilisateur Inconnu',
          sender_email: '',
          network_distance: activityData.network_distance,
          unipile_response: activityData.unipile_response
        };
      });

      console.log('✅ Final formatted activities:', formattedMessages);
      setMessages(formattedMessages);
    } catch (error) {
      console.error('💥 Unexpected error fetching message history:', error);
      setMessages([]);
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

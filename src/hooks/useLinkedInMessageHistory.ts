
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
          sent_by_user_id
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

      // Analyser chaque message individuellement
      data.forEach((msg, index) => {
        console.log(`📝 Message ${index + 1}:`, {
          id: msg.id,
          sent_by_user_id: msg.sent_by_user_id,
          message_preview: msg.message_content.substring(0, 50) + '...',
          sent_at: msg.sent_at
        });
      });

      // Récupérer les profils des expéditeurs
      const userIds = [...new Set(data.map(msg => msg.sent_by_user_id).filter(Boolean))];
      console.log('👥 Unique user IDs to fetch profiles for:', userIds);
      console.log('🔢 Total unique user IDs:', userIds.length);

      if (userIds.length === 0) {
        console.log('⚠️ No user IDs found, setting messages without sender names');
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

      console.log('🔍 Querying profiles table with user IDs:', userIds);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError);
      }

      console.log('👤 Profiles data retrieved:', profiles);
      console.log('📊 Number of profiles found:', profiles?.length || 0);
      
      // Analyser chaque profil trouvé
      if (profiles && profiles.length > 0) {
        profiles.forEach((profile, index) => {
          console.log(`👤 Profile ${index + 1}:`, {
            id: profile.id,
            full_name: profile.full_name,
            email: profile.email
          });
        });
      } else {
        console.log('⚠️ No profiles found in database for the given user IDs');
      }

      // Vérifier manuellement l'ID spécifique mentionné par l'utilisateur
      const specificUserId = '00422c98-cb42-40d9-ab55-54f60a6a728c';
      if (userIds.includes(specificUserId)) {
        console.log(`🎯 ANALYSE SPÉCIFIQUE pour l'ID utilisateur ${specificUserId}:`);
        const specificProfile = profiles?.find(p => p.id === specificUserId);
        console.log('- Profil trouvé dans la requête:', specificProfile);
        
        // Requête directe pour cet ID spécifique
        const { data: directProfile, error: directError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', specificUserId)
          .single();
          
        console.log('- Requête directe pour cet ID:', directProfile);
        console.log('- Erreur requête directe:', directError);
      }

      const formattedMessages = data.map((msg, index) => {
        const profile = profiles?.find(p => p.id === msg.sent_by_user_id);
        
        console.log(`🔗 Message ${index + 1} mapping:`, {
          message_id: msg.id,
          sent_by_user_id: msg.sent_by_user_id,
          found_profile: profile,
          resulting_sender_name: profile?.full_name || profile?.email || 'Utilisateur Inconnu',
          message_time: new Date(msg.sent_at).toLocaleString('fr-FR')
        });
        
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

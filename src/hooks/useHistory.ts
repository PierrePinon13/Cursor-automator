
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface HistoryActivity {
  id: string;
  type: 'linkedin_message' | 'phone_call';
  title: string;
  message: string;
  created_at: string;
  lead_data?: any;
  sender_name?: string;
  message_type?: 'connection_request' | 'direct_message';
  message_content?: string;
}

export const useHistory = () => {
  const [activities, setActivities] = useState<HistoryActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchHistory = async (limit = 50) => {
    if (!user) return;

    setLoading(true);
    try {
      console.log('🔍 Fetching history from activities table...');
      console.log('👤 Current user:', user.id);
      
      // First, let's check if we have any activities at all
      const { count, error: countError } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true });

      console.log('📊 Total activities in database:', count);
      
      if (countError) {
        console.error('❌ Error counting activities:', countError);
      }

      const { data: activitiesData, error } = await supabase
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
        .in('activity_type', ['linkedin_message', 'phone_call'])
        .order('performed_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching history:', error);
        return;
      }

      console.log('📋 Raw activities data:', activitiesData);
      console.log('📊 Activities count from query:', activitiesData?.length || 0);

      if (!activitiesData || activitiesData.length === 0) {
        console.log('⚠️ No activities found in activities table');
        
        // Fallback: check linkedin_messages table
        console.log('🔄 Checking linkedin_messages table as fallback...');
        const { data: linkedinMessagesData, error: linkedinError } = await supabase
          .from('linkedin_messages')
          .select(`
            *,
            lead:leads(
              id,
              author_name,
              author_headline,
              author_profile_url,
              company_name,
              company_position,
              matched_client_name
            )
          `)
          .order('sent_at', { ascending: false })
          .limit(limit);

        if (linkedinError) {
          console.error('❌ Error fetching linkedin_messages:', linkedinError);
          setActivities([]);
          return;
        }

        console.log('📧 LinkedIn messages found:', linkedinMessagesData?.length || 0);

        if (linkedinMessagesData && linkedinMessagesData.length > 0) {
          const transformedFromLinkedIn = linkedinMessagesData.map((msg: any) => {
            const lead = msg.lead || {};
            const title = msg.message_type === 'connection_request' ? 'Demande de connexion LinkedIn' : 'Message LinkedIn';
            const message = `${title} envoyé à ${lead.author_name || 'Lead inconnu'}`;
            
            return {
              id: msg.id,
              type: 'linkedin_message' as const,
              title,
              message,
              created_at: msg.sent_at,
              lead_data: lead,
              sender_name: msg.sender_full_name || 'Utilisateur Inconnu',
              message_type: msg.message_type as 'connection_request' | 'direct_message',
              message_content: msg.message_content || null
            };
          });

          console.log('✅ Using linkedin_messages as fallback data');
          setActivities(transformedFromLinkedIn);
          return;
        }

        setActivities([]);
        return;
      }

      // Transform activities data
      const transformedActivities = activitiesData.map((activity: any) => {
        const lead = activity.lead || {};
        const activityData = activity.activity_data || {};
        
        let title = '';
        let message = '';
        
        switch (activity.activity_type) {
          case 'linkedin_message':
            const messageType = activityData.message_type || 'direct_message';
            const networkDistance = activityData.network_distance ? ` (${activityData.network_distance})` : '';
            
            if (messageType === 'connection_request') {
              title = 'Demande de connexion LinkedIn';
              message = `Demande de connexion envoyée à ${lead.author_name || 'Lead inconnu'}${networkDistance}${lead.company_position ? ` - ${lead.company_position}` : ''}`;
            } else {
              title = 'Message LinkedIn';
              message = `Message direct envoyé à ${lead.author_name || 'Lead inconnu'}${networkDistance}${lead.company_position ? ` - ${lead.company_position}` : ''}`;
            }
            break;
            
          case 'phone_call':
            const statusText = activity.outcome === 'positive' ? 'positif' : 
                              activity.outcome === 'negative' ? 'négatif' : 'neutre';
            title = `Appel ${statusText}`;
            message = `Appel ${statusText} avec ${lead.author_name || 'Lead inconnu'}${lead.company_position ? ` - ${lead.company_position}` : ''}`;
            break;
            
          default:
            title = 'Activité';
            message = 'Activité non définie';
        }

        return {
          id: activity.id,
          type: activity.activity_type as 'linkedin_message' | 'phone_call',
          title,
          message,
          created_at: activity.performed_at,
          lead_data: lead,
          sender_name: activity.performed_by_user_name || 'Utilisateur Inconnu',
          message_type: activityData.message_type as 'connection_request' | 'direct_message',
          message_content: activityData.message_content || null
        };
      });

      console.log('✅ Final transformed activities:', transformedActivities.length);
      setActivities(transformedActivities);

    } catch (error) {
      console.error('💥 Unexpected error fetching history:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  return {
    activities,
    loading,
    refreshHistory: fetchHistory
  };
};

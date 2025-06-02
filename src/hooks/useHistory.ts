
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

      // ✅ FIX: Use explicit relationship name to resolve ambiguity
      const { data: activitiesData, error } = await supabase
        .from('activities')
        .select(`
          *,
          lead:leads!activities_lead_id_fkey(
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
        console.log('🔄 Trying fallback approach without lead join...');
        
        // Fallback: Get activities without lead join if the join fails
        const { data: simpleActivitiesData, error: simpleError } = await supabase
          .from('activities')
          .select('*')
          .in('activity_type', ['linkedin_message', 'phone_call'])
          .order('performed_at', { ascending: false })
          .limit(limit);

        if (simpleError) {
          console.error('❌ Even simple query failed:', simpleError);
          setActivities([]);
          return;
        }

        console.log('📋 Fallback activities data:', simpleActivitiesData);
        
        // Transform without lead data
        const transformedFallback = simpleActivitiesData?.map((activity: any) => {
          const activityData = activity.activity_data || {};
          
          let title = '';
          let message = '';
          
          switch (activity.activity_type) {
            case 'linkedin_message':
              const messageType = activityData.message_type || 'direct_message';
              
              if (messageType === 'connection_request') {
                title = 'Demande de connexion LinkedIn';
                message = `Demande de connexion envoyée`;
              } else {
                title = 'Message LinkedIn';
                message = `Message direct envoyé`;
              }
              break;
              
            case 'phone_call':
              const statusText = activity.outcome === 'positive' ? 'positif' : 
                                activity.outcome === 'negative' ? 'négatif' : 'neutre';
              title = `Appel ${statusText}`;
              message = `Appel ${statusText}`;
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
            lead_data: null, // No lead data in fallback
            sender_name: activity.performed_by_user_name || 'Utilisateur Inconnu',
            message_type: activityData.message_type as 'connection_request' | 'direct_message',
            message_content: activityData.message_content || null
          };
        }) || [];

        console.log('✅ Using fallback data:', transformedFallback.length);
        setActivities(transformedFallback);
        return;
      }

      console.log('📋 Raw activities data:', activitiesData);
      console.log('📊 Activities count from query:', activitiesData?.length || 0);

      if (!activitiesData || activitiesData.length === 0) {
        console.log('⚠️ No activities found in activities table');
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

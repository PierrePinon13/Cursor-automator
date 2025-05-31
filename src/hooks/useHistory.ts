
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
  message_content?: string; // Nouveau champ pour le contenu du message
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

      console.log('📋 History data:', activitiesData);

      if (!activitiesData || activitiesData.length === 0) {
        console.log('⚠️ No history found');
        setActivities([]);
        return;
      }

      // Transformer les données pour correspondre à l'interface HistoryActivity
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
          message_content: activityData.message_content || null // Récupérer le contenu du message
        };
      });

      console.log('✅ Transformed history activities:', transformedActivities.length);
      setActivities(transformedActivities);

    } catch (error) {
      console.error('💥 Error fetching history:', error);
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

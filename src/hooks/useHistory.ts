
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
      console.log('🔍 Fetching history with explicit join...');
      console.log('👤 Current user:', user.id);
      
      // Récupérer les activités avec jointure sur les leads
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select(`
          id,
          activity_type,
          outcome,
          performed_by_user_name,
          performed_at,
          activity_data,
          lead_id,
          performed_by_user_id,
          leads!activities_lead_id_fkey (
            id,
            author_name,
            author_headline,
            author_profile_url,
            company_name,
            company_position,
            matched_client_name,
            unipile_company,
            unipile_position
          )
        `)
        .in('activity_type', ['linkedin_message', 'phone_call'])
        .order('performed_at', { ascending: false })
        .limit(limit);

      if (activitiesError) {
        console.error('❌ Error fetching activities:', activitiesError);
        setActivities([]);
        return;
      }

      console.log('✅ Activities fetched successfully:', activitiesData?.length || 0);

      if (!activitiesData || activitiesData.length === 0) {
        console.log('⚠️ No activities found');
        setActivities([]);
        return;
      }

      // Transformer les activités avec les données des leads
      const transformedActivities = activitiesData.map((activity: any) => {
        const activityData = activity.activity_data || {};
        const leadData = activity.leads;
        
        let title = '';
        let message = '';
        
        switch (activity.activity_type) {
          case 'linkedin_message':
            const messageType = activityData.message_type || 'direct_message';
            
            if (messageType === 'connection_request') {
              title = 'Demande de connexion LinkedIn';
              message = leadData 
                ? `Demande de connexion envoyée à ${leadData.author_name}${leadData.company_position || leadData.unipile_position ? ` - ${leadData.company_position || leadData.unipile_position}` : ''}`
                : `Demande de connexion envoyée`;
            } else {
              title = 'Message LinkedIn';
              message = leadData 
                ? `Message direct envoyé à ${leadData.author_name}${leadData.company_position || leadData.unipile_position ? ` - ${leadData.company_position || leadData.unipile_position}` : ''}`
                : `Message direct envoyé`;
            }
            break;
            
          case 'phone_call':
            const statusText = activity.outcome === 'positive' ? 'positif' : 
                              activity.outcome === 'negative' ? 'négatif' : 'neutre';
            title = `Appel ${statusText}`;
            message = leadData 
              ? `Appel ${statusText} avec ${leadData.author_name}${leadData.company_position || leadData.unipile_position ? ` - ${leadData.company_position || leadData.unipile_position}` : ''}`
              : `Appel ${statusText}`;
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
          lead_data: leadData,
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

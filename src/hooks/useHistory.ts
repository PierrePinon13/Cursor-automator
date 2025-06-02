
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

      // Try simple query first without join
      console.log('🔄 Trying simple query without lead join...');
      
      const { data: simpleActivitiesData, error: simpleError } = await supabase
        .from('activities')
        .select('*')
        .in('activity_type', ['linkedin_message', 'phone_call'])
        .order('performed_at', { ascending: false })
        .limit(limit);

      if (simpleError) {
        console.error('❌ Simple query failed:', simpleError);
        setActivities([]);
        return;
      }

      console.log('📋 Simple activities data:', simpleActivitiesData);
      
      if (!simpleActivitiesData || simpleActivitiesData.length === 0) {
        console.log('⚠️ No activities found in activities table');
        setActivities([]);
        return;
      }

      // Transform without lead data for now
      const transformedActivities = simpleActivitiesData.map((activity: any) => {
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
          lead_data: null, // No lead data for now
          sender_name: activity.performed_by_user_name || 'Utilisateur Inconnu',
          message_type: activityData.message_type as 'connection_request' | 'direct_message',
          message_content: activityData.message_content || null
        };
      });

      console.log('✅ Final transformed activities:', transformedActivities.length);
      setActivities(transformedActivities);

      // Try to get lead data separately if we have lead_ids
      try {
        console.log('🔍 Attempting to fetch lead data separately...');
        const activitiesWithLeadIds = simpleActivitiesData.filter(a => a.lead_id);
        
        if (activitiesWithLeadIds.length > 0) {
          const leadIds = activitiesWithLeadIds.map(a => a.lead_id);
          const { data: leadsData, error: leadsError } = await supabase
            .from('leads')
            .select('id, author_name, author_headline, author_profile_url, company_name, company_position, matched_client_name')
            .in('id', leadIds);

          if (!leadsError && leadsData) {
            console.log('✅ Successfully fetched lead data:', leadsData.length);
            
            // Update activities with lead data
            const enhancedActivities = transformedActivities.map(activity => {
              const originalActivity = simpleActivitiesData.find(a => a.id === activity.id);
              if (originalActivity?.lead_id) {
                const leadData = leadsData.find(lead => lead.id === originalActivity.lead_id);
                if (leadData) {
                  return {
                    ...activity,
                    lead_data: leadData,
                    message: activity.type === 'linkedin_message' 
                      ? `${activity.title} à ${leadData.author_name}${leadData.company_position ? ` - ${leadData.company_position}` : ''}`
                      : `${activity.title} avec ${leadData.author_name}${leadData.company_position ? ` - ${leadData.company_position}` : ''}`
                  };
                }
              }
              return activity;
            });
            
            setActivities(enhancedActivities);
            console.log('✅ Activities enhanced with lead data');
          }
        }
      } catch (leadError) {
        console.log('⚠️ Could not fetch lead data, continuing with basic activities');
      }

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

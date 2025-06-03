
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

interface HistoryFilters {
  activityTypes?: string[];
  timeFilter?: string;
  searchQuery?: string;
  filterBy?: 'all' | 'mine';
  customDateRange?: { from?: Date; to?: Date };
  limit?: number;
}

export const useHistoryWithFilters = (filters: HistoryFilters = {}) => {
  const [activities, setActivities] = useState<HistoryActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchHistory = async () => {
    if (!user) return;

    setLoading(true);
    try {
      console.log('🔍 Fetching filtered history with filters:', filters);
      
      let query = supabase
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
        `);

      // Filtrer par type d'activité
      if (filters.activityTypes && filters.activityTypes.length > 0) {
        query = query.in('activity_type', filters.activityTypes);
      } else {
        query = query.in('activity_type', ['linkedin_message', 'phone_call']);
      }

      // Filtrer par utilisateur (all/mine)
      if (filters.filterBy === 'mine') {
        query = query.eq('performed_by_user_id', user.id);
      }

      // Filtrer par période
      if (filters.timeFilter && filters.timeFilter !== 'all') {
        const now = new Date();
        let startDate: Date;
        
        switch (filters.timeFilter) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'this-week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'this-month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'custom':
            if (filters.customDateRange?.from) {
              startDate = filters.customDateRange.from;
              if (filters.customDateRange.to) {
                const endDate = new Date(filters.customDateRange.to);
                endDate.setHours(23, 59, 59, 999); // Fin de journée
                query = query.lte('performed_at', endDate.toISOString());
              }
            } else {
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Défaut: cette semaine
            }
            break;
          default:
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Défaut: cette semaine
        }
        
        query = query.gte('performed_at', startDate.toISOString());
      }

      query = query
        .order('performed_at', { ascending: false })
        .limit(filters.limit || 100);

      const { data: activitiesData, error } = await query;

      if (error) {
        console.error('❌ Error fetching activities:', error);
        setActivities([]);
        return;
      }

      console.log('✅ Activities fetched successfully:', activitiesData?.length || 0);

      if (!activitiesData || activitiesData.length === 0) {
        console.log('⚠️ No activities found');
        setActivities([]);
        return;
      }

      // Transformer les activités
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

      // Filtrer par recherche côté client (pour la simplicité)
      let filteredActivities = transformedActivities;
      if (filters.searchQuery) {
        const searchLower = filters.searchQuery.toLowerCase();
        filteredActivities = transformedActivities.filter(activity => 
          activity.title.toLowerCase().includes(searchLower) ||
          activity.message.toLowerCase().includes(searchLower) ||
          (activity.sender_name && activity.sender_name.toLowerCase().includes(searchLower)) ||
          (activity.lead_data?.author_name && activity.lead_data.author_name.toLowerCase().includes(searchLower))
        );
      }

      console.log('✅ Final filtered activities:', filteredActivities.length);
      setActivities(filteredActivities);

    } catch (error) {
      console.error('💥 Unexpected error fetching history:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user, filters.activityTypes, filters.timeFilter, filters.searchQuery, filters.filterBy, filters.customDateRange?.from, filters.customDateRange?.to]);

  return {
    activities,
    loading,
    refreshHistory: fetchHistory
  };
};

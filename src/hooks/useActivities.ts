
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Activity {
  id: string;
  lead_id: string;
  activity_type: 'linkedin_message' | 'phone_call' | 'linkedin_connection';
  activity_data: any;
  outcome: string;
  performed_by_user_id: string;
  performed_by_user_name: string;
  performed_at: string;
  created_at: string;
  lead: {
    author_name: string;
    author_headline: string;
    author_profile_url: string;
    company_name: string;
    company_position: string;
    matched_client_name: string;
    latest_post_urn: string;
    latest_post_url: string;
  };
}

export const useActivities = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchActivities = async (
    filterBy: 'all' | 'mine' = 'all',
    activityTypes: string[] = ['linkedin_message', 'phone_call'],
    timeFilter?: string,
    customDateRange?: any,
    limit = 50
  ) => {
    if (!user) return;

    setLoading(true);
    try {
      console.log('🔍 Fetching activities from activities table...');
      
      let query = supabase
        .from('activities')
        .select(`
          *,
          lead:leads(
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
        .order('performed_at', { ascending: false })
        .limit(limit);

      // Filtre par utilisateur
      if (filterBy === 'mine') {
        query = query.eq('performed_by_user_id', user.id);
      }

      // Filtre par type d'activité
      if (activityTypes.length > 0) {
        query = query.in('activity_type', activityTypes);
      }

      // Filtres temporels
      if (timeFilter && timeFilter !== 'custom') {
        const now = new Date();
        let startDate: Date;

        switch (timeFilter) {
          case '1h':
            startDate = new Date(now.getTime() - 60 * 60 * 1000);
            break;
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'yesterday':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
            query = query.gte('performed_at', startDate.toISOString())
                        .lt('performed_at', endDate.toISOString());
            break;
          case 'this_week':
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay() + 1);
            startOfWeek.setHours(0, 0, 0, 0);
            startDate = startOfWeek;
            break;
          case 'last_week':
            const startOfLastWeek = new Date(now);
            startOfLastWeek.setDate(now.getDate() - now.getDay() - 6);
            startOfLastWeek.setHours(0, 0, 0, 0);
            const endOfLastWeek = new Date(startOfLastWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
            query = query.gte('performed_at', startOfLastWeek.toISOString())
                        .lt('performed_at', endOfLastWeek.toISOString());
            break;
          case 'this_month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'last_month':
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            query = query.gte('performed_at', startOfLastMonth.toISOString())
                        .lte('performed_at', endOfLastMonth.toISOString());
            break;
          default:
            startDate = new Date(0);
        }

        if (startDate && !['yesterday', 'last_week', 'last_month'].includes(timeFilter)) {
          query = query.gte('performed_at', startDate.toISOString());
        }
      }

      // Filtre par plage de dates personnalisée
      if (timeFilter === 'custom' && customDateRange?.from) {
        const from = new Date(customDateRange.from);
        from.setHours(0, 0, 0, 0);
        query = query.gte('performed_at', from.toISOString());

        if (customDateRange.to) {
          const to = new Date(customDateRange.to);
          to.setHours(23, 59, 59, 999);
          query = query.lte('performed_at', to.toISOString());
        }
      }

      const { data: activitiesData, error } = await query;

      if (error) {
        console.error('❌ Error fetching activities:', error);
        setActivities([]);
        return;
      }

      console.log('📋 Activities data:', activitiesData);

      if (!activitiesData || activitiesData.length === 0) {
        console.log('⚠️ No activities found');
        setActivities([]);
        return;
      }

      // Transformer les données pour correspondre à l'interface attendue
      const transformedActivities = activitiesData.map((activity: any) => ({
        id: activity.id,
        lead_id: activity.lead_id,
        activity_type: activity.activity_type,
        activity_data: activity.activity_data,
        outcome: activity.outcome,
        performed_by_user_id: activity.performed_by_user_id,
        performed_by_user_name: activity.performed_by_user_name,
        performed_at: activity.performed_at,
        created_at: activity.created_at,
        lead: activity.lead || {
          author_name: 'Utilisateur inconnu',
          author_headline: '',
          author_profile_url: '',
          company_name: '',
          company_position: '',
          matched_client_name: '',
          latest_post_urn: '',
          latest_post_url: ''
        }
      }));

      console.log('✅ Transformed activities:', transformedActivities.length);
      setActivities(transformedActivities);

    } catch (error) {
      console.error('💥 Error fetching activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const createActivity = async (activityData: {
    lead_id: string;
    activity_type: 'linkedin_message' | 'phone_call' | 'linkedin_connection';
    activity_data: any;
    outcome: string;
    performed_at?: string;
  }) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('activities')
        .insert({
          lead_id: activityData.lead_id,
          activity_type: activityData.activity_type,
          activity_data: activityData.activity_data,
          outcome: activityData.outcome,
          performed_by_user_id: user.id,
          performed_by_user_name: user.user_metadata?.full_name || 'Utilisateur',
          performed_at: activityData.performed_at || new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Mettre à jour les stats utilisateur
      if (activityData.activity_type === 'linkedin_message') {
        await supabase.rpc('increment_linkedin_messages', {
          user_uuid: user.id
        });
      } else if (activityData.activity_type === 'phone_call') {
        if (activityData.outcome === 'positive') {
          await supabase.rpc('increment_positive_calls', {
            user_uuid: user.id
          });
        } else if (activityData.outcome === 'negative') {
          await supabase.rpc('increment_negative_calls', {
            user_uuid: user.id
          });
        }
      }

      return data;
    } catch (error) {
      console.error('Error creating activity:', error);
      throw error;
    }
  };

  return {
    activities,
    loading,
    fetchActivities,
    createActivity
  };
};

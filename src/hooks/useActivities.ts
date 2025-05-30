
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
    unipile_company: string;
    unipile_position: string;
    matched_client_name: string;
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
      // Utiliser une requête SQL directe pour accéder à la table activities
      let query = `
        SELECT 
          a.*,
          l.author_name,
          l.author_headline,
          l.author_profile_url,
          l.unipile_company,
          l.unipile_position,
          l.matched_client_name
        FROM activities a
        LEFT JOIN leads l ON a.lead_id = l.id
        WHERE 1=1
      `;

      const params: any[] = [];
      let paramCount = 0;

      // Filtre par utilisateur
      if (filterBy === 'mine') {
        paramCount++;
        query += ` AND a.performed_by_user_id = $${paramCount}`;
        params.push(user.id);
      }

      // Filtre par type d'activité
      if (activityTypes.length > 0) {
        paramCount++;
        query += ` AND a.activity_type = ANY($${paramCount})`;
        params.push(activityTypes);
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
            paramCount++;
            query += ` AND a.performed_at >= $${paramCount}`;
            params.push(startDate.toISOString());
            paramCount++;
            query += ` AND a.performed_at < $${paramCount}`;
            params.push(endDate.toISOString());
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
            paramCount++;
            query += ` AND a.performed_at >= $${paramCount}`;
            params.push(startOfLastWeek.toISOString());
            paramCount++;
            query += ` AND a.performed_at < $${paramCount}`;
            params.push(endOfLastWeek.toISOString());
            break;
          case 'this_month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'last_month':
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            paramCount++;
            query += ` AND a.performed_at >= $${paramCount}`;
            params.push(startOfLastMonth.toISOString());
            paramCount++;
            query += ` AND a.performed_at <= $${paramCount}`;
            params.push(endOfLastMonth.toISOString());
            break;
          default:
            startDate = new Date(0);
        }

        if (startDate && !['yesterday', 'last_week', 'last_month'].includes(timeFilter)) {
          paramCount++;
          query += ` AND a.performed_at >= $${paramCount}`;
          params.push(startDate.toISOString());
        }
      }

      // Filtre par plage de dates personnalisée
      if (timeFilter === 'custom' && customDateRange?.from) {
        const from = new Date(customDateRange.from);
        from.setHours(0, 0, 0, 0);
        paramCount++;
        query += ` AND a.performed_at >= $${paramCount}`;
        params.push(from.toISOString());

        if (customDateRange.to) {
          const to = new Date(customDateRange.to);
          to.setHours(23, 59, 59, 999);
          paramCount++;
          query += ` AND a.performed_at <= $${paramCount}`;
          params.push(to.toISOString());
        }
      }

      query += ` ORDER BY a.performed_at DESC LIMIT ${limit}`;

      console.log('Executing activities query:', query, 'with params:', params);

      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: query,
        params: params
      });

      if (error) {
        console.error('Error fetching activities with RPC:', error);
        // Fallback: essayer une requête simple sans paramètres
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('activities' as any)
          .select(`
            *,
            lead:leads (
              author_name,
              author_headline,
              author_profile_url,
              unipile_company,
              unipile_position,
              matched_client_name
            )
          `)
          .order('performed_at', { ascending: false })
          .limit(limit);

        if (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          throw fallbackError;
        }

        console.log('Fallback activities data:', fallbackData);
        setActivities(fallbackData || []);
      } else {
        console.log('Activities data from RPC:', data);
        // Transformer les données pour correspondre à notre interface
        const transformedData = data?.map((row: any) => ({
          ...row,
          lead: {
            author_name: row.author_name,
            author_headline: row.author_headline,
            author_profile_url: row.author_profile_url,
            unipile_company: row.unipile_company,
            unipile_position: row.unipile_position,
            matched_client_name: row.matched_client_name,
          }
        })) || [];
        setActivities(transformedData);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
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
        .from('activities' as any)
        .insert({
          ...activityData,
          performed_by_user_id: user.id,
          performed_by_user_name: user.user_metadata?.full_name || 'Utilisateur',
          performed_at: activityData.performed_at || new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Mettre à jour les stats utilisateur
      await supabase.rpc('increment_user_activity_stats', {
        user_uuid: user.id,
        activity_type_param: activityData.activity_type,
        outcome_param: activityData.outcome
      });

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

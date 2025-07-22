
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type TimeFilter = 'today' | 'this-week' | 'last-week' | 'this-month' | 'last-month';
export type ViewType = 'personal' | 'team';

export interface UserStat {
  id: string;
  user_id: string;
  user_email: string;
  stat_date: string;
  linkedin_messages_sent: number;
  positive_calls: number;
  negative_calls: number;
}

export interface AggregatedStats {
  linkedin_messages_sent: number;
  positive_calls: number;
  negative_calls: number;
  total_calls: number;
  success_rate: number;
}

export const useUserStats = () => {
  const [stats, setStats] = useState<UserStat[]>([]);
  const [aggregatedStats, setAggregatedStats] = useState<AggregatedStats>({
    linkedin_messages_sent: 0,
    positive_calls: 0,
    negative_calls: 0,
    total_calls: 0,
    success_rate: 0,
  });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const getDateRange = (filter: TimeFilter) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filter) {
      case 'today':
        return { start: today, end: today };
      
      case 'this-week': {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return { start: startOfWeek, end: endOfWeek };
      }
      
      case 'last-week': {
        const startOfLastWeek = new Date(today);
        startOfLastWeek.setDate(today.getDate() - today.getDay() - 6);
        const endOfLastWeek = new Date(startOfLastWeek);
        endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
        return { start: startOfLastWeek, end: endOfLastWeek };
      }
      
      case 'this-month': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { start: startOfMonth, end: endOfMonth };
      }
      
      case 'last-month': {
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        return { start: startOfLastMonth, end: endOfLastMonth };
      }
      
      default:
        return null;
    }
  };

  const fetchStats = async (viewType: ViewType, timeFilter: TimeFilter) => {
    if (!user) return;

    setLoading(true);
    try {
      console.log('🔍 Fetching stats with:', { viewType, timeFilter, userId: user.id });
      
      // Récupérer les activités
      let query = supabase
        .from('activities')
        .select(`
          *,
          profiles!activities_performed_by_user_id_fkey (
            id,
            email
          )
        `)
        .in('activity_type', ['linkedin_message', 'phone_call']);

      if (viewType === 'personal') {
        query = query.eq('performed_by_user_id', user.id);
      }

      // Filtre temporel
      const dateRange = getDateRange(timeFilter);
      if (dateRange) {
        const startDate = dateRange.start.toISOString();
        const endDate = new Date(dateRange.end.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
        console.log('📅 Activities date range:', { 
          timeFilter,
          start: startDate,
          end: endDate,
          startObj: dateRange.start,
          endObj: dateRange.end
        });
        
        query = query
          .gte('performed_at', startDate)
          .lte('performed_at', endDate);
      }

      console.log('🔍 Executing activities query:', query);
      const { data: activitiesData, error: activitiesError } = await query;

      if (activitiesError) {
        console.error('❌ Activities error:', activitiesError);
        throw activitiesError;
      }

      console.log('📊 Raw activities data:', {
        count: activitiesData?.length || 0,
        sample: activitiesData?.slice(0, 3)
      });

      // Grouper les activités par utilisateur et par jour
      const statsByUserAndDay = activitiesData?.reduce((acc: Record<string, UserStat>, activity: any) => {
        const date = activity.performed_at.split('T')[0];
        const userId = activity.performed_by_user_id;
        const userEmail = activity.profiles?.email || 'Utilisateur inconnu';
        const key = `${userId}_${date}`;

        if (!acc[key]) {
          acc[key] = {
            id: `${userId}_${date}`,
            user_id: userId,
            user_email: userEmail,
            stat_date: date,
            linkedin_messages_sent: 0,
            positive_calls: 0,
            negative_calls: 0
          };
        }

        if (activity.activity_type === 'linkedin_message') {
          acc[key].linkedin_messages_sent++;
        } else if (activity.activity_type === 'phone_call') {
          if (activity.outcome === 'positive') {
            acc[key].positive_calls++;
          } else if (activity.outcome === 'negative') {
            acc[key].negative_calls++;
          }
        }

        return acc;
      }, {});

      const processedStats = Object.values(statsByUserAndDay || {});
      console.log('📊 Processed stats from activities:', {
        count: processedStats.length,
        stats: processedStats
      });

      setStats(processedStats);

      // Calculer les statistiques agrégées
      const totals = processedStats.reduce(
        (acc, stat) => ({
          linkedin_messages_sent: acc.linkedin_messages_sent + stat.linkedin_messages_sent,
          positive_calls: acc.positive_calls + stat.positive_calls,
          negative_calls: acc.negative_calls + stat.negative_calls,
        }),
        { linkedin_messages_sent: 0, positive_calls: 0, negative_calls: 0 }
      );

      const totalCalls = totals.positive_calls + totals.negative_calls;
      const successRate = totalCalls > 0 ? (totals.positive_calls / totalCalls) * 100 : 0;

      const aggregated = {
        ...totals,
        total_calls: totalCalls,
        success_rate: successRate,
      };

      console.log('📊 Final aggregated stats:', aggregated);
      setAggregatedStats(aggregated);

    } catch (error) {
      console.error('❌ Error in fetchStats:', error);
      setStats([]);
      setAggregatedStats({
        linkedin_messages_sent: 0,
        positive_calls: 0,
        negative_calls: 0,
        total_calls: 0,
        success_rate: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    stats,
    aggregatedStats,
    loading,
    fetchStats,
  };
};

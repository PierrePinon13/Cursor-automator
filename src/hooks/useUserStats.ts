
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type TimeFilter = 'today' | 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'all-time';
export type ViewType = 'personal' | 'global' | 'comparison';

interface UserStat {
  id: string;
  user_id: string;
  stat_date: string;
  linkedin_messages_sent: number;
  positive_calls: number;
  negative_calls: number;
  user_email?: string;
}

interface AggregatedStats {
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
        startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Lundi
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Dimanche
        return { start: startOfWeek, end: endOfWeek };
      }
      
      case 'last-week': {
        const startOfLastWeek = new Date(today);
        startOfLastWeek.setDate(today.getDate() - today.getDay() - 6); // Lundi dernière semaine
        const endOfLastWeek = new Date(startOfLastWeek);
        endOfLastWeek.setDate(startOfLastWeek.getDate() + 6); // Dimanche dernière semaine
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
      console.log('Fetching stats with:', { viewType, timeFilter, userId: user.id });
      
      // Utiliser d'abord les stats existantes de la table user_stats
      let query = supabase
        .from('user_stats')
        .select('*');

      // Filtre par utilisateur pour la vue personnelle
      if (viewType === 'personal') {
        query = query.eq('user_id', user.id);
      }

      // Filtre temporel
      const dateRange = getDateRange(timeFilter);
      if (dateRange) {
        const startDateStr = dateRange.start.toISOString().split('T')[0];
        const endDateStr = dateRange.end.toISOString().split('T')[0];
        console.log('Date range:', { start: startDateStr, end: endDateStr });
        
        query = query
          .gte('stat_date', startDateStr)
          .lte('stat_date', endDateStr);
      }

      const { data: statsData, error: statsError } = await query.order('stat_date', { ascending: false });

      if (statsError) {
        console.error('Stats error:', statsError);
        throw statsError;
      }

      console.log('Raw stats data:', statsData);

      // Récupérer les informations des profils utilisateur séparément
      const userIds = [...new Set(statsData?.map(stat => stat.user_id) || [])];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      if (profilesError) {
        console.warn('Error fetching profiles:', profilesError);
      }

      // Créer un map des emails par user_id
      const emailMap = new Map(profilesData?.map(profile => [profile.id, profile.email]) || []);

      const processedStats = statsData?.map(stat => ({
        ...stat,
        user_email: emailMap.get(stat.user_id) || 'Utilisateur inconnu'
      })) || [];

      console.log('Processed stats:', processedStats);
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

      console.log('Aggregated stats:', aggregated);
      setAggregatedStats(aggregated);

      // Si pas de données dans user_stats, essayer de générer des stats depuis la table activities
      if (processedStats.length === 0) {
        try {
          console.log('No user_stats data, trying to fetch from activities table');
          await generateStatsFromActivities(viewType, timeFilter);
        } catch (activitiesError) {
          console.warn('Could not fetch stats from activities table:', activitiesError);
        }
      }

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateStatsFromActivities = async (viewType: ViewType, timeFilter: TimeFilter) => {
    // Fallback: générer des stats depuis la table activities si elle est accessible
    const dateRange = getDateRange(timeFilter);
    
    let activitiesQuery = supabase
      .from('activities' as any)
      .select('*');

    if (viewType === 'personal') {
      activitiesQuery = activitiesQuery.eq('performed_by_user_id', user!.id);
    }

    if (dateRange) {
      const startDate = dateRange.start.toISOString();
      const endDate = new Date(dateRange.end.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
      
      activitiesQuery = activitiesQuery
        .gte('performed_at', startDate)
        .lte('performed_at', endDate);
    }

    const { data: activitiesData, error: activitiesError } = await activitiesQuery;

    if (activitiesError) {
      console.error('Error fetching activities for stats:', activitiesError);
      return;
    }

    console.log('Activities data for stats:', activitiesData);

    // Vérifier que les données sont valides
    const validActivities = Array.isArray(activitiesData) ? 
      activitiesData.filter((activity: any) => 
        activity && 
        typeof activity === 'object' && 
        activity.activity_type
      ) : [];

    // Calculer les stats à partir des activités
    const totals = validActivities.reduce(
      (acc: any, activity: any) => {
        if (activity.activity_type === 'linkedin_message') {
          acc.linkedin_messages_sent += 1;
        } else if (activity.activity_type === 'phone_call') {
          if (activity.outcome === 'positive') {
            acc.positive_calls += 1;
          } else if (activity.outcome === 'negative') {
            acc.negative_calls += 1;
          }
        }
        return acc;
      },
      { linkedin_messages_sent: 0, positive_calls: 0, negative_calls: 0 }
    );

    const totalCalls = totals.positive_calls + totals.negative_calls;
    const successRate = totalCalls > 0 ? (totals.positive_calls / totalCalls) * 100 : 0;

    const aggregated = {
      ...totals,
      total_calls: totalCalls,
      success_rate: successRate,
    };

    console.log('Generated stats from activities:', aggregated);
    setAggregatedStats(aggregated);
  };

  return {
    stats,
    aggregatedStats,
    loading,
    fetchStats,
  };
};


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
      let query = supabase
        .from('user_stats')
        .select(`
          *,
          profiles!inner(email)
        `);

      // Filtre par utilisateur pour la vue personnelle
      if (viewType === 'personal') {
        query = query.eq('user_id', user.id);
      }

      // Filtre temporel
      const dateRange = getDateRange(timeFilter);
      if (dateRange) {
        query = query
          .gte('stat_date', dateRange.start.toISOString().split('T')[0])
          .lte('stat_date', dateRange.end.toISOString().split('T')[0]);
      }

      const { data, error } = await query.order('stat_date', { ascending: false });

      if (error) throw error;

      const processedStats = data?.map(stat => ({
        ...stat,
        user_email: stat.profiles?.email
      })) || [];

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

      setAggregatedStats({
        ...totals,
        total_calls: totalCalls,
        success_rate: successRate,
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
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

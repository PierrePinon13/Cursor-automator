
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type TimeRange = {
  start: Date;
  end: Date;
  label: string;
};

export type UserSelection = {
  type: 'personal' | 'global' | 'specific';
  userIds?: string[];
};

export interface DashboardStats {
  linkedin_messages: number;
  positive_calls: number;
  negative_calls: number;
  total_calls: number;
  success_rate: number;
}

export interface DashboardData {
  stats: DashboardStats;
  evolution: Array<{
    date: string;
    linkedin_messages: number;
    positive_calls: number;
    negative_calls: number;
    success_rate: number;
  }>;
  userComparison?: Array<{
    user_id: string;
    user_email: string;
    stats: DashboardStats;
  }>;
}

interface UserStatRow {
  user_id: string;
  stat_date: string;
  linkedin_messages_sent: number;
  positive_calls: number;
  negative_calls: number;
  created_at?: string;
  id?: string;
  updated_at?: string;
}

export const useDashboardStats = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchStats = useCallback(async (
    timeRange: TimeRange,
    userSelection: UserSelection
  ) => {
    if (!user) return;

    setLoading(true);
    try {
      console.log('Fetching dashboard stats:', { timeRange, userSelection });

      // Construire la requête de base
      let query = supabase
        .from('user_stats')
        .select('*');

      // Filtre temporel
      const startDate = timeRange.start.toISOString().split('T')[0];
      const endDate = timeRange.end.toISOString().split('T')[0];
      query = query
        .gte('stat_date', startDate)
        .lte('stat_date', endDate);

      // Filtre utilisateur
      if (userSelection.type === 'personal') {
        query = query.eq('user_id', user.id);
      } else if (userSelection.type === 'specific' && userSelection.userIds) {
        query = query.in('user_id', userSelection.userIds);
      }

      const { data: rawData, error } = await query.order('stat_date');

      if (error) throw error;

      // Récupérer les emails des utilisateurs séparément
      const userIds = [...new Set(rawData?.map(stat => stat.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      const emailMap = new Map(profilesData?.map(profile => [profile.id, profile.email]) || []);

      // Ajouter les emails aux données
      const enrichedData = rawData?.map(stat => ({
        ...stat,
        user_email: emailMap.get(stat.user_id) || 'Utilisateur inconnu'
      })) || [];

      // Traitement des données
      const processedData = processRawData(enrichedData, userSelection);
      setData(processedData);

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    data,
    loading,
    fetchStats,
  };
};

function processRawData(rawData: (UserStatRow & { user_email?: string })[], userSelection: UserSelection): DashboardData {
  // Statistiques globales
  const totalStats = rawData.reduce(
    (acc, stat) => ({
      linkedin_messages: acc.linkedin_messages + stat.linkedin_messages_sent,
      positive_calls: acc.positive_calls + stat.positive_calls,
      negative_calls: acc.negative_calls + stat.negative_calls,
    }),
    { linkedin_messages: 0, positive_calls: 0, negative_calls: 0 }
  );

  const total_calls = totalStats.positive_calls + totalStats.negative_calls;
  const success_rate = total_calls > 0 ? (totalStats.positive_calls / total_calls) * 100 : 0;

  const stats: DashboardStats = {
    ...totalStats,
    total_calls,
    success_rate,
  };

  // Évolution temporelle (groupée par date)
  const evolutionMap = rawData.reduce((acc, stat) => {
    const date = stat.stat_date;
    if (!acc[date]) {
      acc[date] = {
        linkedin_messages: 0,
        positive_calls: 0,
        negative_calls: 0,
      };
    }
    acc[date].linkedin_messages += stat.linkedin_messages_sent;
    acc[date].positive_calls += stat.positive_calls;
    acc[date].negative_calls += stat.negative_calls;
    return acc;
  }, {} as Record<string, any>);

  const evolution = Object.entries(evolutionMap)
    .map(([date, data]) => ({
      date,
      linkedin_messages: data.linkedin_messages,
      positive_calls: data.positive_calls,
      negative_calls: data.negative_calls,
      success_rate: data.positive_calls + data.negative_calls > 0 
        ? (data.positive_calls / (data.positive_calls + data.negative_calls)) * 100 
        : 0,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Comparaison par utilisateur (si applicable)
  let userComparison: DashboardData['userComparison'];
  if (userSelection.type === 'specific' || userSelection.type === 'global') {
    const userStatsMap = rawData.reduce((acc, stat) => {
      const userId = stat.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          user_id: userId,
          user_email: stat.user_email || 'Inconnu',
          linkedin_messages: 0,
          positive_calls: 0,
          negative_calls: 0,
        };
      }
      acc[userId].linkedin_messages += stat.linkedin_messages_sent;
      acc[userId].positive_calls += stat.positive_calls;
      acc[userId].negative_calls += stat.negative_calls;
      return acc;
    }, {} as Record<string, any>);

    userComparison = Object.values(userStatsMap).map((userData: any) => {
      const total_calls = userData.positive_calls + userData.negative_calls;
      return {
        user_id: userData.user_id,
        user_email: userData.user_email,
        stats: {
          linkedin_messages: userData.linkedin_messages,
          positive_calls: userData.positive_calls,
          negative_calls: userData.negative_calls,
          total_calls,
          success_rate: total_calls > 0 ? (userData.positive_calls / total_calls) * 100 : 0,
        },
      };
    });
  }

  return {
    stats,
    evolution,
    userComparison,
  };
}

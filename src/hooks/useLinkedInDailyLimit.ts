
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const DAILY_LINKEDIN_LIMIT = 25;
const MAX_DAILY_LINKEDIN_LIMIT = 30;

export function useLinkedInDailyLimit() {
  const [dailyCount, setDailyCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchDailyCount = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('user_stats')
        .select('linkedin_messages_sent')
        .eq('user_id', user.id)
        .eq('stat_date', today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching daily LinkedIn count:', error);
        setDailyCount(0);
      } else {
        setDailyCount(data?.linkedin_messages_sent || 0);
      }
    } catch (error) {
      console.error('Error fetching daily LinkedIn count:', error);
      setDailyCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyCount();
  }, [user]);

  const isAtLimit = dailyCount >= DAILY_LINKEDIN_LIMIT;
  const isAtMaxLimit = dailyCount >= MAX_DAILY_LINKEDIN_LIMIT;
  const remainingMessages = Math.max(0, DAILY_LINKEDIN_LIMIT - dailyCount);

  const incrementCount = () => {
    setDailyCount(prev => prev + 1);
  };

  return {
    dailyCount,
    remainingMessages,
    isAtLimit,
    isAtMaxLimit,
    loading,
    incrementCount,
    fetchDailyCount,
    DAILY_LINKEDIN_LIMIT,
    MAX_DAILY_LINKEDIN_LIMIT
  };
}

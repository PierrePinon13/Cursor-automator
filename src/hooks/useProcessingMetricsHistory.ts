
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProcessingMetricsHistoryPoint {
  id: string;
  hour_timestamp: string;
  step1_conversion_rate: number;
  step2_conversion_rate: number;
  step3_conversion_rate: number;
  total_posts_processed: number;
  posts_completed: number;
  posts_failed: number;
  avg_processing_time_minutes: number;
  error_rate: number;
  duplicate_rate: number;
}

export const useProcessingMetricsHistory = (hours: number = 24) => {
  const [metricsHistory, setMetricsHistory] = useState<ProcessingMetricsHistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMetricsHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('processing_metrics_hourly')
        .select('*')
        .gte('hour_timestamp', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
        .order('hour_timestamp', { ascending: true });

      if (error) throw error;
      setMetricsHistory(data || []);
    } catch (error) {
      console.error('Error fetching metrics history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetricsHistory();
  }, [hours]);

  return {
    metricsHistory,
    loading,
    refetch: fetchMetricsHistory,
  };
};

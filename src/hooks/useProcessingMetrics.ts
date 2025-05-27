
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProcessingMetrics {
  total_posts: number;
  step1_passed: number;
  step2_passed: number;
  step3_passed: number;
  completed: number;
  not_job_posting: number;
  filtered_out: number;
  duplicate: number;
  deduplication_error: number;
  processing: number;
  pending: number;
  error: number;
}

export interface ConversionRates {
  step1_rate: number;
  step2_rate: number;
  step3_rate: number;
  completion_rate: number;
}

export const useProcessingMetrics = (timeFilter: string = 'this-week') => {
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [conversionRates, setConversionRates] = useState<ConversionRates | null>(null);
  const [loading, setLoading] = useState(false);

  const getDateRange = (filter: string) => {
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
      
      case 'this-month': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { start: startOfMonth, end: endOfMonth };
      }
      
      default:
        return null;
    }
  };

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('linkedin_posts')
        .select('processing_status, openai_step1_recrute_poste, openai_step2_reponse, openai_step3_categorie');

      const dateRange = getDateRange(timeFilter);
      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculer les métriques
      const totalPosts = data.length;
      
      const step1Passed = data.filter(post => 
        post.openai_step1_recrute_poste?.toLowerCase() === 'oui' || 
        post.openai_step1_recrute_poste?.toLowerCase() === 'yes'
      ).length;
      
      const step2Passed = data.filter(post => 
        (post.openai_step1_recrute_poste?.toLowerCase() === 'oui' || 
         post.openai_step1_recrute_poste?.toLowerCase() === 'yes') &&
        (post.openai_step2_reponse?.toLowerCase() === 'oui' || 
         post.openai_step2_reponse?.toLowerCase() === 'yes')
      ).length;
      
      const step3Passed = data.filter(post => 
        (post.openai_step1_recrute_poste?.toLowerCase() === 'oui' || 
         post.openai_step1_recrute_poste?.toLowerCase() === 'yes') &&
        (post.openai_step2_reponse?.toLowerCase() === 'oui' || 
         post.openai_step2_reponse?.toLowerCase() === 'yes') &&
        post.openai_step3_categorie && 
        post.openai_step3_categorie !== 'Autre'
      ).length;

      // Compter par statut
      const statusCounts = data.reduce((acc, post) => {
        const status = post.processing_status || 'pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const processedMetrics: ProcessingMetrics = {
        total_posts: totalPosts,
        step1_passed: step1Passed,
        step2_passed: step2Passed,
        step3_passed: step3Passed,
        completed: statusCounts.completed || 0,
        not_job_posting: statusCounts.not_job_posting || 0,
        filtered_out: statusCounts.filtered_out || 0,
        duplicate: statusCounts.duplicate || 0,
        deduplication_error: statusCounts.deduplication_error || 0,
        processing: statusCounts.processing || 0,
        pending: statusCounts.pending || 0,
        error: statusCounts.error || 0,
      };

      // Calculer les taux de conversion
      const rates: ConversionRates = {
        step1_rate: totalPosts > 0 ? (step1Passed / totalPosts) * 100 : 0,
        step2_rate: step1Passed > 0 ? (step2Passed / step1Passed) * 100 : 0,
        step3_rate: step2Passed > 0 ? (step3Passed / step2Passed) * 100 : 0,
        completion_rate: totalPosts > 0 ? (processedMetrics.completed / totalPosts) * 100 : 0,
      };

      setMetrics(processedMetrics);
      setConversionRates(rates);

    } catch (error) {
      console.error('Error fetching processing metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [timeFilter]);

  return {
    metrics,
    conversionRates,
    loading,
    refetch: fetchMetrics,
  };
};

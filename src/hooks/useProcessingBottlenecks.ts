
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProcessingBottlenecks {
  step1_pending: number;
  step2_pending: number;
  step3_pending: number;
  unipile_pending: number;
  message_pending: number;
  last_hour: number;
  last_24h: number;
  older_than_24h: number;
  total_processing: number;
}

export const useProcessingBottlenecks = () => {
  const [bottlenecks, setBottlenecks] = useState<ProcessingBottlenecks | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBottlenecks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_processing_bottlenecks');
      
      if (error) {
        console.error('Error fetching bottlenecks:', error);
        // Fallback to manual query if RPC doesn't exist
        const fallbackQuery = `
          SELECT 
            COUNT(CASE WHEN openai_step1_recrute_poste IS NULL THEN 1 END) as step1_pending,
            COUNT(CASE WHEN openai_step1_recrute_poste IS NOT NULL AND openai_step2_reponse IS NULL THEN 1 END) as step2_pending,
            COUNT(CASE WHEN openai_step2_reponse IS NOT NULL AND openai_step3_categorie IS NULL THEN 1 END) as step3_pending,
            COUNT(CASE WHEN openai_step3_categorie IS NOT NULL AND unipile_profile_scraped = false THEN 1 END) as unipile_pending,
            COUNT(CASE WHEN unipile_profile_scraped = true AND approach_message_generated = false THEN 1 END) as message_pending,
            COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as last_hour,
            COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' AND created_at <= NOW() - INTERVAL '1 hour' THEN 1 END) as last_24h,
            COUNT(CASE WHEN created_at <= NOW() - INTERVAL '24 hours' THEN 1 END) as older_than_24h,
            COUNT(*) as total_processing
          FROM linkedin_posts 
          WHERE processing_status = 'processing'
        `;
        
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('linkedin_posts')
          .select('*')
          .eq('processing_status', 'processing');
          
        if (fallbackError) throw fallbackError;
        
        // Calculate manually
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        const result = {
          step1_pending: fallbackData?.filter(p => !p.openai_step1_recrute_poste).length || 0,
          step2_pending: fallbackData?.filter(p => p.openai_step1_recrute_poste && !p.openai_step2_reponse).length || 0,
          step3_pending: fallbackData?.filter(p => p.openai_step2_reponse && !p.openai_step3_categorie).length || 0,
          unipile_pending: fallbackData?.filter(p => p.openai_step3_categorie && !p.unipile_profile_scraped).length || 0,
          message_pending: fallbackData?.filter(p => p.unipile_profile_scraped && !p.approach_message_generated).length || 0,
          last_hour: fallbackData?.filter(p => new Date(p.created_at) > oneHourAgo).length || 0,
          last_24h: fallbackData?.filter(p => new Date(p.created_at) > oneDayAgo && new Date(p.created_at) <= oneHourAgo).length || 0,
          older_than_24h: fallbackData?.filter(p => new Date(p.created_at) <= oneDayAgo).length || 0,
          total_processing: fallbackData?.length || 0
        };
        
        setBottlenecks(result);
      } else {
        setBottlenecks(data[0]);
      }
    } catch (error) {
      console.error('Error fetching processing bottlenecks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBottlenecks();
  }, []);

  return {
    bottlenecks,
    loading,
    refetch: fetchBottlenecks,
  };
};


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
      // Récupérer directement tous les posts en processing
      const { data, error } = await supabase
        .from('linkedin_posts')
        .select('*')
        .eq('processing_status', 'processing');
        
      if (error) {
        console.error('Error fetching processing posts:', error);
        return;
      }
      
      if (!data) {
        console.log('No data returned from processing posts query');
        setBottlenecks({
          step1_pending: 0,
          step2_pending: 0,
          step3_pending: 0,
          unipile_pending: 0,
          message_pending: 0,
          last_hour: 0,
          last_24h: 0,
          older_than_24h: 0,
          total_processing: 0
        });
        return;
      }
      
      // Calculer manuellement les métriques
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const result: ProcessingBottlenecks = {
        step1_pending: data.filter(p => !p.openai_step1_recrute_poste).length,
        step2_pending: data.filter(p => p.openai_step1_recrute_poste && !p.openai_step2_reponse).length,
        step3_pending: data.filter(p => p.openai_step2_reponse && !p.openai_step3_categorie).length,
        unipile_pending: data.filter(p => p.openai_step3_categorie && !p.unipile_profile_scraped).length,
        message_pending: data.filter(p => p.unipile_profile_scraped && !p.approach_message_generated).length,
        last_hour: data.filter(p => new Date(p.created_at) > oneHourAgo).length,
        last_24h: data.filter(p => new Date(p.created_at) > oneDayAgo && new Date(p.created_at) <= oneHourAgo).length,
        older_than_24h: data.filter(p => new Date(p.created_at) <= oneDayAgo).length,
        total_processing: data.length
      };
      
      setBottlenecks(result);
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


import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FunnelStepPost {
  id: string;
  text: string;
  title?: string;
  author_name?: string;
  author_type: string;
  created_at: string;
  processing_status?: string;
  openai_step1_recrute_poste?: string;
  openai_step2_reponse?: string;
  openai_step3_categorie?: string;
  unipile_profile_scraped?: boolean;
  lead_id?: string;
  url: string;
}

export const useFunnelStepData = (step: string, timeFilter: string, isOpen: boolean) => {
  const [data, setData] = useState<FunnelStepPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log('useFunnelStepData called:', { step, timeFilter, isOpen });

  const getDateRange = (filter: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filter) {
      case 'last-hour': {
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        return { start: oneHourAgo, end: now };
      }
      case 'today':
        return { start: today, end: now };
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const endYesterday = new Date(today);
        return { start: yesterday, end: endYesterday };
      }
      case 'this-week': {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1);
        return { start: startOfWeek, end: now };
      }
      case 'last-week': {
        const startOfLastWeek = new Date(today);
        startOfLastWeek.setDate(today.getDate() - today.getDay() - 6);
        const endOfLastWeek = new Date(today);
        endOfLastWeek.setDate(today.getDate() - today.getDay());
        return { start: startOfLastWeek, end: endOfLastWeek };
      }
      case 'this-month': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: startOfMonth, end: now };
      }
      default:
        return { start: today, end: now };
    }
  };

  const fetchStepData = async () => {
    if (!isOpen) {
      console.log('Not fetching - step not open');
      return;
    }
    
    console.log('fetchStepData starting for step:', step);
    setLoading(true);
    setError(null);
    
    try {
      const dateRange = getDateRange(timeFilter);
      console.log('Date range for step data:', dateRange);
      
      let query = supabase
        .from('linkedin_posts')
        .select(`
          id,
          text,
          title,
          author_name,
          author_type,
          created_at,
          processing_status,
          openai_step1_recrute_poste,
          openai_step2_reponse,
          openai_step3_categorie,
          unipile_profile_scraped,
          lead_id,
          url
        `)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .order('created_at', { ascending: false });

      // Apply filters based on step - simplified logic
      console.log('Applying filters for step:', step);
      switch (step) {
        case 'apify-received':
          // All posts received
          break;
          
        case 'person-filter':
          // Posts filtered by Person filter (those that did NOT pass)
          query = query.neq('author_type', 'Person');
          break;
          
        case 'openai-step1':
          // Posts that passed Person filter but not step 1
          query = query
            .eq('author_type', 'Person')
            .not('openai_step1_recrute_poste', 'ilike', '%oui%')
            .not('openai_step1_recrute_poste', 'ilike', '%yes%');
          break;
          
        case 'openai-step2':
          // Posts that passed step 1 but not step 2
          query = query
            .eq('author_type', 'Person')
            .or('openai_step1_recrute_poste.ilike.%oui%,openai_step1_recrute_poste.ilike.%yes%')
            .not('openai_step2_reponse', 'ilike', '%oui%')
            .not('openai_step2_reponse', 'ilike', '%yes%');
          break;
          
        case 'openai-step3':
          // Posts that passed step 2 but not step 3
          query = query
            .eq('author_type', 'Person')
            .or('openai_step1_recrute_poste.ilike.%oui%,openai_step1_recrute_poste.ilike.%yes%')
            .or('openai_step2_reponse.ilike.%oui%,openai_step2_reponse.ilike.%yes%')
            .or('openai_step3_categorie.is.null,openai_step3_categorie.eq.Autre');
          break;
          
        case 'unipile-scraped':
          // Posts that passed step 3 but not Unipile scraping
          query = query
            .eq('author_type', 'Person')
            .or('openai_step1_recrute_poste.ilike.%oui%,openai_step1_recrute_poste.ilike.%yes%')
            .or('openai_step2_reponse.ilike.%oui%,openai_step2_reponse.ilike.%yes%')
            .not('openai_step3_categorie', 'eq', 'Autre')
            .not('openai_step3_categorie', 'is', null)
            .neq('unipile_profile_scraped', true);
          break;
          
        case 'added-to-leads':
          // Posts that were scraped but not added to leads
          query = query
            .eq('author_type', 'Person')
            .or('openai_step1_recrute_poste.ilike.%oui%,openai_step1_recrute_poste.ilike.%yes%')
            .or('openai_step2_reponse.ilike.%oui%,openai_step2_reponse.ilike.%yes%')
            .not('openai_step3_categorie', 'eq', 'Autre')
            .not('openai_step3_categorie', 'is', null)
            .eq('unipile_profile_scraped', true)
            .is('lead_id', null);
          break;
      }

      const { data: posts, error } = await query.limit(100);
      console.log('Step data query result:', { data: posts, error, step });

      if (error) throw error;

      setData(posts || []);

    } catch (err: any) {
      console.error('Error fetching step data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('useFunnelStepData useEffect triggered:', { step, timeFilter, isOpen });
    fetchStepData();
  }, [step, timeFilter, isOpen]);

  return {
    data,
    loading,
    error,
    refetch: fetchStepData
  };
};

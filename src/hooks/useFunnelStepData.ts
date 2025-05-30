
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
    if (!isOpen) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const dateRange = getDateRange(timeFilter);
      
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

      // Appliquer les filtres selon l'étape
      switch (step) {
        case 'apify-received':
          // Tous les posts reçus
          break;
          
        case 'person-filter':
          // Posts filtrés par le filtre Person (ceux qui n'ont PAS passé)
          query = query.neq('author_type', 'Person');
          break;
          
        case 'openai-step1':
          // Posts qui ont passé le filtre Person mais pas l'étape 1
          query = query
            .eq('author_type', 'Person')
            .not('openai_step1_recrute_poste', 'in', '("Oui","oui","Yes","yes")');
          break;
          
        case 'openai-step2':
          // Posts qui ont passé l'étape 1 mais pas l'étape 2
          query = query
            .eq('author_type', 'Person')
            .in('openai_step1_recrute_poste', ['Oui', 'oui', 'Yes', 'yes'])
            .not('openai_step2_reponse', 'in', '("Oui","oui","Yes","yes")');
          break;
          
        case 'openai-step3':
          // Posts qui ont passé l'étape 2 mais pas l'étape 3
          query = query
            .eq('author_type', 'Person')
            .in('openai_step1_recrute_poste', ['Oui', 'oui', 'Yes', 'yes'])
            .in('openai_step2_reponse', ['Oui', 'oui', 'Yes', 'yes'])
            .or('openai_step3_categorie.is.null,openai_step3_categorie.eq.Autre');
          break;
          
        case 'unipile-scraped':
          // Posts qui ont passé l'étape 3 mais pas le scraping Unipile
          query = query
            .eq('author_type', 'Person')
            .in('openai_step1_recrute_poste', ['Oui', 'oui', 'Yes', 'yes'])
            .in('openai_step2_reponse', ['Oui', 'oui', 'Yes', 'yes'])
            .not('openai_step3_categorie', 'in', '("Autre")')
            .not('openai_step3_categorie', 'is', null)
            .neq('unipile_profile_scraped', true);
          break;
          
        case 'added-to-leads':
          // Posts qui ont été scrapés mais pas ajoutés aux leads
          query = query
            .eq('author_type', 'Person')
            .in('openai_step1_recrute_poste', ['Oui', 'oui', 'Yes', 'yes'])
            .in('openai_step2_reponse', ['Oui', 'oui', 'Yes', 'yes'])
            .not('openai_step3_categorie', 'in', '("Autre")')
            .not('openai_step3_categorie', 'is', null)
            .eq('unipile_profile_scraped', true)
            .is('lead_id', null);
          break;
      }

      const { data: posts, error } = await query.limit(100);

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
    fetchStepData();
  }, [step, timeFilter, isOpen]);

  return {
    data,
    loading,
    error,
    refetch: fetchStepData
  };
};

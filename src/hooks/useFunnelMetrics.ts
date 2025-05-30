
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FunnelStepMetrics {
  step: string;
  count: number;
  percentage: number;
  description: string;
}

export interface FunnelData {
  steps: FunnelStepMetrics[];
  timeFilter: string;
}

export const useFunnelMetrics = (timeFilter: string = 'today') => {
  const [metrics, setMetrics] = useState<FunnelData | null>(null);
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

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const dateRange = getDateRange(timeFilter);
      
      // Récupérer tous les posts dans la période
      const { data: allPosts, error: allPostsError } = await supabase
        .from('linkedin_posts')
        .select('*')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      if (allPostsError) throw allPostsError;

      const totalPosts = allPosts?.length || 0;
      
      // Étape 1: Filtre Person (author_type = 'Person')
      const personPosts = allPosts?.filter(post => post.author_type === 'Person') || [];
      
      // Étape 2: OpenAI Step 1 (recrute_poste = 'Oui')
      const step1Passed = personPosts?.filter(post => 
        post.openai_step1_recrute_poste?.toLowerCase() === 'oui' || 
        post.openai_step1_recrute_poste?.toLowerCase() === 'yes'
      ) || [];
      
      // Étape 3: OpenAI Step 2 (reponse = 'Oui')
      const step2Passed = step1Passed?.filter(post => 
        post.openai_step2_reponse?.toLowerCase() === 'oui' || 
        post.openai_step2_reponse?.toLowerCase() === 'yes'
      ) || [];
      
      // Étape 4: OpenAI Step 3 (categorie != 'Autre')
      const step3Passed = step2Passed?.filter(post => 
        post.openai_step3_categorie && 
        post.openai_step3_categorie !== 'Autre'
      ) || [];
      
      // Étape 5: Unipile scraped
      const unipileScraped = step3Passed?.filter(post => 
        post.unipile_profile_scraped === true
      ) || [];
      
      // Étape 6: Ajoutés aux leads
      const addedToLeads = unipileScraped?.filter(post => 
        post.lead_id !== null
      ) || [];

      const steps: FunnelStepMetrics[] = [
        {
          step: 'apify-received',
          count: totalPosts,
          percentage: 100,
          description: 'Posts reçus d\'Apify'
        },
        {
          step: 'person-filter',
          count: personPosts.length,
          percentage: totalPosts > 0 ? (personPosts.length / totalPosts) * 100 : 0,
          description: 'Filtre Person (author_type = Person)'
        },
        {
          step: 'openai-step1',
          count: step1Passed.length,
          percentage: personPosts.length > 0 ? (step1Passed.length / personPosts.length) * 100 : 0,
          description: 'OpenAI Step 1 (Détection recrutement)'
        },
        {
          step: 'openai-step2',
          count: step2Passed.length,
          percentage: step1Passed.length > 0 ? (step2Passed.length / step1Passed.length) * 100 : 0,
          description: 'OpenAI Step 2 (Langue et localisation)'
        },
        {
          step: 'openai-step3',
          count: step3Passed.length,
          percentage: step2Passed.length > 0 ? (step3Passed.length / step2Passed.length) * 100 : 0,
          description: 'OpenAI Step 3 (Catégorisation)'
        },
        {
          step: 'unipile-scraped',
          count: unipileScraped.length,
          percentage: step3Passed.length > 0 ? (unipileScraped.length / step3Passed.length) * 100 : 0,
          description: 'Profil Unipile scrapé'
        },
        {
          step: 'added-to-leads',
          count: addedToLeads.length,
          percentage: unipileScraped.length > 0 ? (addedToLeads.length / unipileScraped.length) * 100 : 0,
          description: 'Ajoutés à la base leads'
        }
      ];

      setMetrics({ steps, timeFilter });

    } catch (err: any) {
      console.error('Error fetching funnel metrics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [timeFilter]);

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics
  };
};

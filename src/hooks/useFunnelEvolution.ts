
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FunnelEvolutionData {
  date: string;
  apify_received_rate: number;
  person_filter_rate: number;
  step1_rate: number;
  step2_rate: number;
  step3_rate: number;
  unipile_rate: number;
  leads_rate: number;
}

export const useFunnelEvolution = (timeFilter: string = 'today') => {
  const [evolutionData, setEvolutionData] = useState<FunnelEvolutionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log('useFunnelEvolution called with timeFilter:', timeFilter);

  const getDateRange = (filter: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filter) {
      case 'last-hour':
        // Pour les données horaires, on affiche les 24 dernières heures
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return { start: yesterday, end: now };
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

  const generateDateRange = (start: Date, end: Date) => {
    const dates = [];
    const current = new Date(start);
    
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  const fetchEvolutionData = async () => {
    console.log('fetchEvolutionData starting...');
    setLoading(true);
    setError(null);
    
    try {
      const dateRange = getDateRange(timeFilter);
      console.log('Date range for evolution:', dateRange);
      
      const dates = generateDateRange(dateRange.start, dateRange.end);
      const evolutionResults: FunnelEvolutionData[] = [];

      for (const date of dates) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const { data: dayPosts, error } = await supabase
          .from('linkedin_posts')
          .select('id, author_type, openai_step1_recrute_poste, openai_step2_reponse, openai_step3_categorie, unipile_profile_scraped, lead_id')
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString());

        if (error) {
          console.error('Error fetching day posts:', error);
          continue;
        }

        const totalPosts = dayPosts?.length || 0;
        
        if (totalPosts === 0) {
          evolutionResults.push({
            date: date.toISOString().split('T')[0],
            apify_received_rate: 0,
            person_filter_rate: 0,
            step1_rate: 0,
            step2_rate: 0,
            step3_rate: 0,
            unipile_rate: 0,
            leads_rate: 0,
          });
          continue;
        }

        const personPosts = dayPosts?.filter(post => post.author_type === 'Person') || [];
        
        const step1Passed = personPosts?.filter(post => {
          const value = post.openai_step1_recrute_poste?.toLowerCase();
          return value === 'oui' || value === 'yes';
        }) || [];
        
        const step2Passed = step1Passed?.filter(post => {
          const value = post.openai_step2_reponse?.toLowerCase();
          return value === 'oui' || value === 'yes';
        }) || [];
        
        const step3Passed = step2Passed?.filter(post => 
          post.openai_step3_categorie && 
          post.openai_step3_categorie !== 'Autre'
        ) || [];
        
        const unipileScraped = step3Passed?.filter(post => 
          post.unipile_profile_scraped === true
        ) || [];
        
        const addedToLeads = unipileScraped?.filter(post => 
          post.lead_id !== null
        ) || [];

        evolutionResults.push({
          date: date.toISOString().split('T')[0],
          apify_received_rate: 100, // Toujours 100% pour les posts reçus
          person_filter_rate: totalPosts > 0 ? (personPosts.length / totalPosts) * 100 : 0,
          step1_rate: personPosts.length > 0 ? (step1Passed.length / personPosts.length) * 100 : 0,
          step2_rate: step1Passed.length > 0 ? (step2Passed.length / step1Passed.length) * 100 : 0,
          step3_rate: step2Passed.length > 0 ? (step3Passed.length / step2Passed.length) * 100 : 0,
          unipile_rate: step3Passed.length > 0 ? (unipileScraped.length / step3Passed.length) * 100 : 0,
          leads_rate: unipileScraped.length > 0 ? (addedToLeads.length / unipileScraped.length) * 100 : 0,
        });
      }

      console.log('Evolution data:', evolutionResults);
      setEvolutionData(evolutionResults);

    } catch (err: any) {
      console.error('Error in fetchEvolutionData:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('useFunnelEvolution useEffect triggered with timeFilter:', timeFilter);
    fetchEvolutionData();
  }, [timeFilter]);

  return {
    evolutionData,
    loading,
    error,
    refetch: fetchEvolutionData
  };
};

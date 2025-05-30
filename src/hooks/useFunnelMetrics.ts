
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

  console.log('useFunnelMetrics called with timeFilter:', timeFilter);

  const getDateRange = (filter: string) => {
    console.log('getDateRange called with filter:', filter);
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
    console.log('fetchMetrics starting...');
    setLoading(true);
    setError(null);
    
    try {
      const dateRange = getDateRange(timeFilter);
      console.log('Date range:', dateRange);
      console.log('Date range ISO strings:', {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString()
      });
      
      // DIAGNOSTIC : Compter le total absolu de posts dans la base
      const { count: absoluteTotalCount, error: countError } = await supabase
        .from('linkedin_posts')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error('Error counting total posts:', countError);
      } else {
        console.log('🔍 TOTAL ABSOLU DE POSTS DANS LA BASE:', absoluteTotalCount);
      }
      
      // DIAGNOSTIC : Tester la requête avec et sans limite
      console.log('=== TEST REQUÊTE AVEC/SANS LIMITE ===');
      
      // Test 1: Requête avec limite par défaut
      const { data: limitedPosts, error: limitedError, count: limitedCount } = await supabase
        .from('linkedin_posts')
        .select('id', { count: 'exact' })
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
        
      console.log('Requête avec limite par défaut:', {
        count: limitedCount,
        returned: limitedPosts?.length,
        error: limitedError
      });
      
      // Test 2: Requête avec limite explicite élevée
      const { data: unlimitedPosts, error: unlimitedError, count: unlimitedCount } = await supabase
        .from('linkedin_posts')
        .select('id', { count: 'exact' })
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .limit(10000); // Limite explicite élevée
        
      console.log('Requête avec limite 10000:', {
        count: unlimitedCount,
        returned: unlimitedPosts?.length,
        error: unlimitedError
      });
      
      // Test 3: Requête juste count
      const { count: justCount, error: justCountError } = await supabase
        .from('linkedin_posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
        
      console.log('Requête count seulement:', {
        count: justCount,
        error: justCountError
      });
      
      console.log('=====================================');
      
      // Utiliser la requête avec limite élevée pour les métriques
      const { data: allPosts, error: allPostsError } = await supabase
        .from('linkedin_posts')
        .select('id, author_type, openai_step1_recrute_poste, openai_step2_reponse, openai_step3_categorie, unipile_profile_scraped, lead_id, created_at')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .limit(10000); // Limite explicite élevée

      console.log('All posts query result:', { data: allPosts, error: allPostsError });

      if (allPostsError) throw allPostsError;

      const totalPosts = allPosts?.length || 0;
      console.log('Total posts récupérés pour les métriques:', totalPosts);
      
      // Si on a encore une limite, alerter l'utilisateur
      if (totalPosts === 10000) {
        console.warn('⚠️ ATTENTION: Limite de 10000 posts atteinte, il pourrait y en avoir plus !');
      }

      const personPosts = allPosts?.filter(post => post.author_type === 'Person') || [];
      console.log('Person posts filtered:', personPosts.length);
      
      const step1Passed = personPosts?.filter(post => {
        const value = post.openai_step1_recrute_poste?.toLowerCase();
        return value === 'oui' || value === 'yes';
      }) || [];
      console.log('Step 1 passed:', step1Passed.length);
      
      const step2Passed = step1Passed?.filter(post => {
        const value = post.openai_step2_reponse?.toLowerCase();
        return value === 'oui' || value === 'yes';
      }) || [];
      console.log('Step 2 passed:', step2Passed.length);
      
      const step3Passed = step2Passed?.filter(post => 
        post.openai_step3_categorie && 
        post.openai_step3_categorie !== 'Autre'
      ) || [];
      console.log('Step 3 passed:', step3Passed.length);
      
      const unipileScraped = step3Passed?.filter(post => 
        post.unipile_profile_scraped === true
      ) || [];
      console.log('Unipile scraped:', unipileScraped.length);
      
      const addedToLeads = unipileScraped?.filter(post => 
        post.lead_id !== null
      ) || [];
      console.log('Added to leads:', addedToLeads.length);

      const steps: FunnelStepMetrics[] = [
        {
          step: 'apify-received',
          count: totalPosts,
          percentage: 100,
          description: `Posts reçus d'Apify (${totalPosts}/${justCount || 'unknown'} total sur la période)`
        },
        {
          step: 'person-filter',
          count: personPosts.length,
          percentage: totalPosts > 0 ? (personPosts.length / totalPosts) * 100 : 0,
          description: 'Filtre Person'
        },
        {
          step: 'openai-step1',
          count: step1Passed.length,
          percentage: personPosts.length > 0 ? (step1Passed.length / personPosts.length) * 100 : 0,
          description: 'OpenAI Step 1'
        },
        {
          step: 'openai-step2',
          count: step2Passed.length,
          percentage: step1Passed.length > 0 ? (step2Passed.length / step1Passed.length) * 100 : 0,
          description: 'OpenAI Step 2'
        },
        {
          step: 'openai-step3',
          count: step3Passed.length,
          percentage: step2Passed.length > 0 ? (step3Passed.length / step2Passed.length) * 100 : 0,
          description: 'OpenAI Step 3'
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

      console.log('Final steps:', steps);
      
      setMetrics({ steps, timeFilter });

    } catch (err: any) {
      console.error('Error in fetchMetrics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('useEffect triggered with timeFilter:', timeFilter);
    fetchMetrics();
  }, [timeFilter]);

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics
  };
};

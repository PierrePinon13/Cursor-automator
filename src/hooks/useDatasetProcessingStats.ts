
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DatasetProcessingStats {
  dataset_id: string;
  total_records: number;
  raw_posts_stored: number;
  posts_stored: number;
  leads_created: number;
  processing_date: string;
}

export interface GlobalProcessingStats {
  period: string;
  total_records: number;
  raw_posts_stored: number;
  posts_stored: number;
  leads_created: number;
  datasets_processed: number;
}

type TimePeriod = '24h' | '7d' | '30d' | 'all';
type ViewMode = 'global' | 'evolution';

export const useDatasetProcessingStats = (
  timePeriod: TimePeriod = '7d',
  viewMode: ViewMode = 'global'
) => {
  const [globalStats, setGlobalStats] = useState<GlobalProcessingStats[]>([]);
  const [evolutionData, setEvolutionData] = useState<DatasetProcessingStats[]>([]);
  const [datasetsList, setDatasetsList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const getDateFilter = (period: TimePeriod) => {
    const now = new Date();
    switch (period) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return null;
    }
  };

  const fetchProcessingStats = async () => {
    try {
      setLoading(true);
      
      const dateFilter = getDateFilter(timePeriod);
      
      // Récupérer les stats des webhooks Apify
      let webhookQuery = supabase
        .from('apify_webhook_stats')
        .select('*')
        .order('created_at', { ascending: false });

      if (dateFilter) {
        webhookQuery = webhookQuery.gte('created_at', dateFilter);
      }

      const { data: webhookStats, error: webhookError } = await webhookQuery;
      if (webhookError) throw webhookError;

      // Récupérer les stats des posts LinkedIn créés
      const { data: postsData, error: postsError } = await supabase
        .from('linkedin_posts')
        .select('apify_dataset_id, created_at')
        .gte('created_at', dateFilter || '2020-01-01');

      if (postsError) throw postsError;

      // Récupérer les leads créés (sans catégorie "Autre")
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('created_at, openai_step3_categorie')
        .neq('openai_step3_categorie', 'Autre')
        .not('openai_step3_categorie', 'is', null)
        .gte('created_at', dateFilter || '2020-01-01');

      if (leadsError) throw leadsError;

      // Créer un map des datasets uniques
      const datasetMap = new Map<string, DatasetProcessingStats>();
      
      // Traiter les stats webhook
      (webhookStats || []).forEach(stat => {
        const date = new Date(stat.created_at).toISOString().split('T')[0];
        const key = `${stat.dataset_id}-${date}`;
        
        if (!datasetMap.has(key)) {
          datasetMap.set(key, {
            dataset_id: stat.dataset_id,
            total_records: stat.total_received,
            raw_posts_stored: stat.stored_raw,
            posts_stored: 0,
            leads_created: 0,
            processing_date: date
          });
        }
      });

      // Ajouter les posts LinkedIn
      (postsData || []).forEach(post => {
        const date = new Date(post.created_at).toISOString().split('T')[0];
        const key = `${post.apify_dataset_id}-${date}`;
        
        if (datasetMap.has(key)) {
          datasetMap.get(key)!.posts_stored++;
        }
      });

      // Ajouter les leads créés
      (leadsData || []).forEach(lead => {
        const date = new Date(lead.created_at).toISOString().split('T')[0];
        // Trouver le dataset correspondant (approximatif par date)
        for (const [key, stats] of datasetMap.entries()) {
          if (stats.processing_date === date) {
            stats.leads_created++;
            break;
          }
        }
      });

      const allStats = Array.from(datasetMap.values());
      setEvolutionData(allStats);

      // Créer les stats globales par période
      if (viewMode === 'global') {
        const periodGroups = new Map<string, DatasetProcessingStats[]>();
        
        allStats.forEach(stat => {
          let periodKey: string;
          const date = new Date(stat.processing_date);
          
          switch (timePeriod) {
            case '24h':
              periodKey = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
              break;
            case '7d':
              periodKey = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
              break;
            case '30d':
              periodKey = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
              break;
            default:
              periodKey = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
              break;
          }
          
          if (!periodGroups.has(periodKey)) {
            periodGroups.set(periodKey, []);
          }
          periodGroups.get(periodKey)!.push(stat);
        });

        const globalStatsData: GlobalProcessingStats[] = Array.from(periodGroups.entries()).map(([period, stats]) => ({
          period,
          total_records: stats.reduce((sum, s) => sum + s.total_records, 0),
          raw_posts_stored: stats.reduce((sum, s) => sum + s.raw_posts_stored, 0),
          posts_stored: stats.reduce((sum, s) => sum + s.posts_stored, 0),
          leads_created: stats.reduce((sum, s) => sum + s.leads_created, 0),
          datasets_processed: stats.length
        })).sort((a, b) => a.period.localeCompare(b.period));

        setGlobalStats(globalStatsData);
      }

      // Extraire la liste des datasets
      const uniqueDatasets = Array.from(new Set(allStats.map(s => s.dataset_id)));
      setDatasetsList(uniqueDatasets);

    } catch (error) {
      console.error('Error fetching processing stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcessingStats();
  }, [timePeriod, viewMode]);

  return {
    globalStats,
    evolutionData,
    datasetsList,
    loading,
    refetch: fetchProcessingStats,
  };
};

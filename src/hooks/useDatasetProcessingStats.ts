
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

export interface DatasetHistoryItem {
  dataset_id: string;
  processing_date: string;
  total_records: number;
  raw_posts_stored: number;
  posts_stored: number;
  leads_created: number;
}

type TimePeriod = '24h' | '7d' | '30d' | 'all';
type ViewMode = 'global' | 'evolution';

export const useDatasetProcessingStats = (
  timePeriod: TimePeriod = '7d',
  viewMode: ViewMode = 'global',
  selectedDatasetId?: string
) => {
  const [globalStats, setGlobalStats] = useState<GlobalProcessingStats[]>([]);
  const [evolutionData, setEvolutionData] = useState<DatasetProcessingStats[]>([]);
  const [datasetHistory, setDatasetHistory] = useState<DatasetHistoryItem[]>([]);
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
      
      // Si un dataset spécifique est sélectionné
      if (selectedDatasetId) {
        await fetchSpecificDatasetStats(selectedDatasetId, dateFilter);
        return;
      }

      // Récupérer les stats des webhooks Apify (sans limite)
      let webhookQuery = supabase
        .from('apify_webhook_stats')
        .select('*')
        .order('created_at', { ascending: false });

      if (dateFilter) {
        webhookQuery = webhookQuery.gte('created_at', dateFilter);
      }

      const { data: webhookStats, error: webhookError } = await webhookQuery;
      if (webhookError) throw webhookError;

      // Récupérer les posts LinkedIn raw (sans limite)
      let rawPostsQuery = supabase
        .from('linkedin_posts_raw')
        .select('apify_dataset_id, created_at')
        .order('created_at', { ascending: false });

      if (dateFilter) {
        rawPostsQuery = rawPostsQuery.gte('created_at', dateFilter);
      }

      const { data: rawPostsData, error: rawPostsError } = await rawPostsQuery;
      if (rawPostsError) throw rawPostsError;

      // Récupérer les posts LinkedIn filtrés (sans limite)
      let postsQuery = supabase
        .from('linkedin_posts')
        .select('apify_dataset_id, created_at')
        .order('created_at', { ascending: false });

      if (dateFilter) {
        postsQuery = postsQuery.gte('created_at', dateFilter);
      }

      const { data: postsData, error: postsError } = await postsQuery;
      if (postsError) throw postsError;

      // Récupérer les leads créés (sans catégorie "Autre" et sans limite)
      let leadsQuery = supabase
        .from('leads')
        .select('created_at, openai_step3_categorie')
        .neq('openai_step3_categorie', 'Autre')
        .not('openai_step3_categorie', 'is', null)
        .order('created_at', { ascending: false });

      if (dateFilter) {
        leadsQuery = leadsQuery.gte('created_at', dateFilter);
      }

      const { data: leadsData, error: leadsError } = await leadsQuery;
      if (leadsError) throw leadsError;

      // Créer un map des datasets avec leurs stats
      const datasetMap = new Map<string, DatasetProcessingStats>();
      
      // Traiter les stats webhook (records reçus)
      (webhookStats || []).forEach(stat => {
        const date = new Date(stat.created_at).toISOString().split('T')[0];
        const key = `${stat.dataset_id}-${date}`;
        
        if (!datasetMap.has(key)) {
          datasetMap.set(key, {
            dataset_id: stat.dataset_id,
            total_records: stat.total_received || 0,
            raw_posts_stored: 0,
            posts_stored: 0,
            leads_created: 0,
            processing_date: date
          });
        }
      });

      // Compter les posts raw par dataset et date
      (rawPostsData || []).forEach(post => {
        const date = new Date(post.created_at).toISOString().split('T')[0];
        const key = `${post.apify_dataset_id}-${date}`;
        
        if (datasetMap.has(key)) {
          datasetMap.get(key)!.raw_posts_stored++;
        } else {
          datasetMap.set(key, {
            dataset_id: post.apify_dataset_id,
            total_records: 0,
            raw_posts_stored: 1,
            posts_stored: 0,
            leads_created: 0,
            processing_date: date
          });
        }
      });

      // Compter les posts filtrés par dataset et date
      (postsData || []).forEach(post => {
        const date = new Date(post.created_at).toISOString().split('T')[0];
        const key = `${post.apify_dataset_id}-${date}`;
        
        if (datasetMap.has(key)) {
          datasetMap.get(key)!.posts_stored++;
        }
      });

      // Compter les leads créés par date (approximatif)
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

      const allStats = Array.from(datasetMap.values()).sort((a, b) => 
        new Date(b.processing_date).getTime() - new Date(a.processing_date).getTime()
      );
      
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

      // Créer l'historique des datasets
      const datasetHistoryMap = new Map<string, DatasetHistoryItem>();
      allStats.forEach(stat => {
        const existing = datasetHistoryMap.get(stat.dataset_id);
        if (!existing || new Date(stat.processing_date) > new Date(existing.processing_date)) {
          datasetHistoryMap.set(stat.dataset_id, {
            dataset_id: stat.dataset_id,
            processing_date: stat.processing_date,
            total_records: stat.total_records,
            raw_posts_stored: stat.raw_posts_stored,
            posts_stored: stat.posts_stored,
            leads_created: stat.leads_created
          });
        }
      });

      const historyData = Array.from(datasetHistoryMap.values()).sort((a, b) => 
        new Date(b.processing_date).getTime() - new Date(a.processing_date).getTime()
      );
      
      setDatasetHistory(historyData);

      // Extraire la liste des datasets
      const uniqueDatasets = Array.from(new Set(allStats.map(s => s.dataset_id)));
      setDatasetsList(uniqueDatasets);

    } catch (error) {
      console.error('Error fetching processing stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpecificDatasetStats = async (datasetId: string, dateFilter: string | null) => {
    try {
      // Stats webhook pour ce dataset
      let webhookQuery = supabase
        .from('apify_webhook_stats')
        .select('*')
        .eq('dataset_id', datasetId)
        .order('created_at', { ascending: false });

      if (dateFilter) {
        webhookQuery = webhookQuery.gte('created_at', dateFilter);
      }

      const { data: webhookStats } = await webhookQuery;

      // Posts raw pour ce dataset
      let rawPostsQuery = supabase
        .from('linkedin_posts_raw')
        .select('created_at')
        .eq('apify_dataset_id', datasetId);

      if (dateFilter) {
        rawPostsQuery = rawPostsQuery.gte('created_at', dateFilter);
      }

      const { data: rawPostsData } = await rawPostsQuery;

      // Posts filtrés pour ce dataset
      let postsQuery = supabase
        .from('linkedin_posts')
        .select('created_at')
        .eq('apify_dataset_id', datasetId);

      if (dateFilter) {
        postsQuery = postsQuery.gte('created_at', dateFilter);
      }

      const { data: postsData } = await postsQuery;

      // Leads créés (approximatif par période)
      let leadsQuery = supabase
        .from('leads')
        .select('created_at')
        .neq('openai_step3_categorie', 'Autre')
        .not('openai_step3_categorie', 'is', null);

      if (dateFilter) {
        leadsQuery = leadsQuery.gte('created_at', dateFilter);
      }

      const { data: leadsData } = await leadsQuery;

      // Créer les stats pour ce dataset spécifique
      const totalRecords = (webhookStats || []).reduce((sum, stat) => sum + (stat.total_received || 0), 0);
      const rawPostsCount = rawPostsData?.length || 0;
      const postsCount = postsData?.length || 0;
      const leadsCount = leadsData?.length || 0;

      const datasetStats: DatasetProcessingStats[] = [{
        dataset_id: datasetId,
        total_records: totalRecords,
        raw_posts_stored: rawPostsCount,
        posts_stored: postsCount,
        leads_created: leadsCount,
        processing_date: new Date().toISOString().split('T')[0]
      }];

      setEvolutionData(datasetStats);
      
      const globalStatsData: GlobalProcessingStats[] = [{
        period: 'Dataset sélectionné',
        total_records: totalRecords,
        raw_posts_stored: rawPostsCount,
        posts_stored: postsCount,
        leads_created: leadsCount,
        datasets_processed: 1
      }];

      setGlobalStats(globalStatsData);

    } catch (error) {
      console.error('Error fetching specific dataset stats:', error);
    }
  };

  useEffect(() => {
    fetchProcessingStats();
  }, [timePeriod, viewMode, selectedDatasetId]);

  return {
    globalStats,
    evolutionData,
    datasetHistory,
    datasetsList,
    loading,
    refetch: fetchProcessingStats,
  };
};

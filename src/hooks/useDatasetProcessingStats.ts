
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
type DisplayMode = 'stats' | 'evolution';

export const useDatasetProcessingStats = (
  timePeriod: TimePeriod = '7d',
  displayMode: DisplayMode = 'stats',
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
      console.log('Fetching processing stats with params:', { timePeriod, displayMode, selectedDatasetId });
      
      const dateFilter = getDateFilter(timePeriod);
      
      // Si un dataset spécifique est sélectionné
      if (selectedDatasetId) {
        await fetchSpecificDatasetStats(selectedDatasetId, dateFilter);
        return;
      }

      // Récupérer les stats des webhooks Apify pour les records reçus
      let webhookQuery = supabase
        .from('apify_webhook_stats')
        .select('*')
        .order('created_at', { ascending: false });

      if (dateFilter) {
        webhookQuery = webhookQuery.gte('created_at', dateFilter);
      }

      const { data: webhookStats, error: webhookError } = await webhookQuery;
      if (webhookError) {
        console.error('Error fetching webhook stats:', webhookError);
        throw webhookError;
      }

      console.log('Webhook stats:', webhookStats?.length || 0, 'records');

      // Récupérer les posts LinkedIn raw
      let rawPostsQuery = supabase
        .from('linkedin_posts_raw')
        .select('apify_dataset_id, created_at')
        .order('created_at', { ascending: false });

      if (dateFilter) {
        rawPostsQuery = rawPostsQuery.gte('created_at', dateFilter);
      }

      const { data: rawPostsData, error: rawPostsError } = await rawPostsQuery;
      if (rawPostsError) {
        console.error('Error fetching raw posts:', rawPostsError);
        throw rawPostsError;
      }

      console.log('Raw posts:', rawPostsData?.length || 0, 'records');

      // Récupérer les posts LinkedIn filtrés
      let postsQuery = supabase
        .from('linkedin_posts')
        .select('apify_dataset_id, created_at')
        .order('created_at', { ascending: false });

      if (dateFilter) {
        postsQuery = postsQuery.gte('created_at', dateFilter);
      }

      const { data: postsData, error: postsError } = await postsQuery;
      if (postsError) {
        console.error('Error fetching posts:', postsError);
        throw postsError;
      }

      console.log('Filtered posts:', postsData?.length || 0, 'records');

      // Récupérer les leads créés (excluant la catégorie "Autre")
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
      if (leadsError) {
        console.error('Error fetching leads:', leadsError);
        throw leadsError;
      }

      console.log('Leads created (excluding Autre):', leadsData?.length || 0, 'records');

      // Créer un map des datasets avec leurs stats
      const datasetStatsMap = new Map<string, DatasetProcessingStats>();
      
      // Traiter les stats webhook (records reçus)
      (webhookStats || []).forEach(stat => {
        const date = new Date(stat.created_at).toISOString().split('T')[0];
        const key = `${stat.dataset_id}-${date}`;
        
        if (!datasetStatsMap.has(key)) {
          datasetStatsMap.set(key, {
            dataset_id: stat.dataset_id,
            total_records: 0,
            raw_posts_stored: 0,
            posts_stored: 0,
            leads_created: 0,
            processing_date: date
          });
        }
        
        const existingStats = datasetStatsMap.get(key)!;
        existingStats.total_records += stat.total_received || 0;
      });

      // Compter les posts raw par dataset et date
      (rawPostsData || []).forEach(post => {
        const date = new Date(post.created_at).toISOString().split('T')[0];
        const key = `${post.apify_dataset_id}-${date}`;
        
        if (!datasetStatsMap.has(key)) {
          datasetStatsMap.set(key, {
            dataset_id: post.apify_dataset_id,
            total_records: 0,
            raw_posts_stored: 0,
            posts_stored: 0,
            leads_created: 0,
            processing_date: date
          });
        }
        
        datasetStatsMap.get(key)!.raw_posts_stored++;
      });

      // Compter les posts filtrés par dataset et date
      (postsData || []).forEach(post => {
        const date = new Date(post.created_at).toISOString().split('T')[0];
        const key = `${post.apify_dataset_id}-${date}`;
        
        if (datasetStatsMap.has(key)) {
          datasetStatsMap.get(key)!.posts_stored++;
        }
      });

      // Estimer les leads créés par date (approximatif)
      (leadsData || []).forEach(lead => {
        const date = new Date(lead.created_at).toISOString().split('T')[0];
        // Trouver le dataset le plus proche dans le temps
        for (const [key, stats] of datasetStatsMap.entries()) {
          if (stats.processing_date === date) {
            stats.leads_created++;
            break;
          }
        }
      });

      const allStats = Array.from(datasetStatsMap.values()).sort((a, b) => 
        new Date(b.processing_date).getTime() - new Date(a.processing_date).getTime()
      );
      
      console.log('Final stats processed:', allStats.length, 'dataset-date combinations');
      
      setEvolutionData(allStats);

      // Créer les stats globales par période
      const periodGroups = new Map<string, DatasetProcessingStats[]>();
      
      allStats.forEach(stat => {
        let periodKey: string;
        const date = new Date(stat.processing_date);
        
        switch (timePeriod) {
          case '24h':
            periodKey = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit' });
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
        datasets_processed: new Set(stats.map(s => s.dataset_id)).size
      })).sort((a, b) => a.period.localeCompare(b.period));

      setGlobalStats(globalStatsData);

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

      console.log('Processing complete:', {
        globalStats: globalStatsData.length,
        evolutionData: allStats.length,
        datasetHistory: historyData.length,
        datasetsList: uniqueDatasets.length
      });

    } catch (error) {
      console.error('Error fetching processing stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpecificDatasetStats = async (datasetId: string, dateFilter: string | null) => {
    try {
      console.log('Fetching specific dataset stats for:', datasetId);

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

      // Leads créés dans la période
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

      console.log('Specific dataset stats:', {
        datasetId,
        totalRecords,
        rawPostsCount,
        postsCount,
        leadsCount
      });

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
  }, [timePeriod, displayMode, selectedDatasetId]);

  return {
    globalStats,
    evolutionData,
    datasetHistory,
    datasetsList,
    loading,
    refetch: fetchProcessingStats,
  };
};

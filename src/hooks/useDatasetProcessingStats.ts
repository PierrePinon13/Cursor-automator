
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DatasetProcessingStats {
  dataset_id: string;
  processing_date: string;
  total_records: number;
  raw_posts_stored: number;
  posts_stored: number;
  leads_created: number;
}

export interface GlobalProcessingStats {
  period: string;
  total_records: number;
  raw_posts_stored: number;
  posts_stored: number;
  leads_created: number;
  datasets_processed: number;
}

export const useDatasetProcessingStats = (
  timePeriod: string = '7d',
  displayMode: string = 'stats',
  selectedDatasetId?: string
) => {
  const [globalStats, setGlobalStats] = useState<GlobalProcessingStats[]>([]);
  const [evolutionData, setEvolutionData] = useState<DatasetProcessingStats[]>([]);
  const [datasetHistory, setDatasetHistory] = useState<DatasetProcessingStats[]>([]);
  const [datasetsList, setDatasetsList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const getDateFilter = (period: string): string | null => {
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

  const fetchStats = async () => {
    setLoading(true);
    try {
      const dateFilter = getDateFilter(timePeriod);
      
      console.log('🔍 Fetching stats with params:', { timePeriod, selectedDatasetId, dateFilter });

      // 1. Récupérer les webhook stats mais aussi les compléter avec les vraies données
      let webhookQuery = supabase
        .from('apify_webhook_stats')
        .select('*');

      if (dateFilter && timePeriod !== 'all') {
        webhookQuery = webhookQuery.gte('started_at', dateFilter);
      }

      if (selectedDatasetId) {
        webhookQuery = webhookQuery.eq('dataset_id', selectedDatasetId);
      }

      const { data: webhookStats, error: webhookError } = await webhookQuery.order('started_at', { ascending: false });

      if (webhookError) {
        console.error('❌ Error fetching webhook stats:', webhookError);
        throw webhookError;
      }

      console.log('📊 Webhook stats fetched:', webhookStats?.length || 0, webhookStats);

      // 2. Récupérer les VRAIES données pour chaque dataset depuis les tables sources
      let datasetStatsMap: Record<string, DatasetProcessingStats> = {};
      let allDatasetIds: string[] = [];

      // Si on a des webhook stats, on utilise leurs dataset IDs
      if (webhookStats && webhookStats.length > 0) {
        allDatasetIds = Array.from(new Set(webhookStats.map(s => s.dataset_id).filter(Boolean)));
      } else {
        // Sinon on récupère tous les datasets depuis les données sources
        const { data: rawDatasets } = await supabase
          .from('linkedin_posts_raw')
          .select('apify_dataset_id')
          .gte('created_at', dateFilter || '2020-01-01');
        
        allDatasetIds = Array.from(new Set(rawDatasets?.map(d => d.apify_dataset_id).filter(Boolean) || []));
      }

      console.log('📊 Processing datasets:', allDatasetIds);

      // 3. Pour chaque dataset, récupérer les vraies métriques
      for (const datasetId of allDatasetIds) {
        console.log(`📊 Processing dataset: ${datasetId}`);
        
        let baseQuery = dateFilter ? { gte: { created_at: dateFilter } } : {};
        
        // Compter les posts raw
        const { count: rawCount } = await supabase
          .from('linkedin_posts_raw')
          .select('*', { count: 'exact', head: true })
          .eq('apify_dataset_id', datasetId)
          .gte('created_at', dateFilter || '2020-01-01');

        // Compter les posts filtrés
        const { count: postsCount } = await supabase
          .from('linkedin_posts')
          .select('*', { count: 'exact', head: true })
          .eq('apify_dataset_id', datasetId)
          .gte('created_at', dateFilter || '2020-01-01');

        // Compter les leads
        const { count: leadsCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('apify_dataset_id', datasetId)
          .gte('created_at', dateFilter || '2020-01-01');

        // Récupérer la date de traitement (webhook ou première entrée)
        const webhookStat = webhookStats?.find(w => w.dataset_id === datasetId);
        let processingDate = webhookStat?.started_at || new Date().toISOString();
        
        // Si pas de webhook stat, prendre la date du premier post raw
        if (!webhookStat) {
          const { data: firstRaw } = await supabase
            .from('linkedin_posts_raw')
            .select('created_at')
            .eq('apify_dataset_id', datasetId)
            .order('created_at', { ascending: true })
            .limit(1)
            .single();
          
          if (firstRaw) {
            processingDate = firstRaw.created_at;
          }
        }

        const datasetStat: DatasetProcessingStats = {
          dataset_id: datasetId,
          processing_date: processingDate.split('T')[0],
          total_records: webhookStat?.total_received || rawCount || 0,
          raw_posts_stored: rawCount || 0,
          posts_stored: postsCount || 0,
          leads_created: leadsCount || 0
        };

        datasetStatsMap[datasetId] = datasetStat;
        
        console.log(`📊 Dataset ${datasetId} stats:`, datasetStat);
      }

      // 4. Convertir en array et trier
      const statsData = Object.values(datasetStatsMap);
      
      // 5. Compter le total global de leads
      let totalLeadsCount = 0;
      if (selectedDatasetId) {
        // Pour un dataset spécifique
        totalLeadsCount = datasetStatsMap[selectedDatasetId]?.leads_created || 0;
      } else {
        // Pour tous les datasets
        const { count: globalLeadsCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', dateFilter || '2020-01-01');
        
        totalLeadsCount = globalLeadsCount || 0;
      }

      // 6. Calculer les stats globales
      const totalRecords = statsData.reduce((sum, s) => sum + s.total_records, 0);
      const totalRawPosts = statsData.reduce((sum, s) => sum + s.raw_posts_stored, 0);
      const totalPosts = statsData.reduce((sum, s) => sum + s.posts_stored, 0);

      const globalStatsData: GlobalProcessingStats = {
        period: selectedDatasetId 
          ? `Dataset ${selectedDatasetId.substring(0, 8)}...` 
          : `Derniers ${timePeriod}`,
        total_records: totalRecords,
        raw_posts_stored: totalRawPosts,
        posts_stored: totalPosts,
        leads_created: totalLeadsCount,
        datasets_processed: statsData.length
      };

      console.log('📊 Final global stats:', globalStatsData);
      console.log('📊 Final dataset stats:', statsData);

      setGlobalStats([globalStatsData]);
      setEvolutionData(statsData);
      setDatasetHistory(statsData);
      
      const uniqueDatasets = allDatasetIds.sort();
      setDatasetsList(uniqueDatasets);

    } catch (error) {
      console.error('❌ Error fetching stats:', error);
      setGlobalStats([]);
      setEvolutionData([]);
      setDatasetHistory([]);
      setDatasetsList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [timePeriod, displayMode, selectedDatasetId]);

  return {
    globalStats,
    evolutionData,
    datasetHistory,
    datasetsList,
    loading,
    refetch: fetchStats
  };
};

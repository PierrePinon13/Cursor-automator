
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
      
      // 1. Récupérer les webhook stats (limitées en nombre, pas de problème de count)
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
        console.error('Error fetching webhook stats:', webhookError);
        throw webhookError;
      }

      console.log('📊 Webhook stats fetched:', webhookStats?.length || 0);

      // 2. Compter les leads GLOBALEMENT avec count: 'exact'
      let totalLeadsCount = 0;
      if (!selectedDatasetId) {
        // Comptage global de tous les leads dans la période
        let globalLeadsQuery = supabase
          .from('leads')
          .select('*', { count: 'exact', head: true });

        if (dateFilter && timePeriod !== 'all') {
          globalLeadsQuery = globalLeadsQuery.gte('created_at', dateFilter);
        }

        const { count: globalCount, error: globalLeadsError } = await globalLeadsQuery;

        if (globalLeadsError) {
          console.error('Error counting global leads:', globalLeadsError);
        } else {
          totalLeadsCount = globalCount || 0;
          console.log('📊 Total leads count (global):', totalLeadsCount);
        }
      }

      // 3. Compter les leads par dataset spécifique (si sélectionné)
      const leadsByDataset: Record<string, number> = {};
      
      if (selectedDatasetId) {
        // Compter pour un dataset spécifique
        let specificLeadsQuery = supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('apify_dataset_id', selectedDatasetId);

        if (dateFilter && timePeriod !== 'all') {
          specificLeadsQuery = specificLeadsQuery.gte('created_at', dateFilter);
        }

        const { count: specificCount, error: specificLeadsError } = await specificLeadsQuery;

        if (specificLeadsError) {
          console.error('Error counting leads for specific dataset:', specificLeadsError);
        } else {
          leadsByDataset[selectedDatasetId] = specificCount || 0;
          totalLeadsCount = specificCount || 0;
          console.log(`📊 Leads count for dataset ${selectedDatasetId}:`, specificCount);
        }
      } else {
        // Compter par dataset pour tous les datasets des webhook stats
        for (const stat of webhookStats || []) {
          if (stat.dataset_id) {
            let datasetLeadsQuery = supabase
              .from('leads')
              .select('*', { count: 'exact', head: true })
              .eq('apify_dataset_id', stat.dataset_id);

            if (dateFilter && timePeriod !== 'all') {
              datasetLeadsQuery = datasetLeadsQuery.gte('created_at', dateFilter);
            }

            const { count: datasetCount, error: datasetLeadsError } = await datasetLeadsQuery;

            if (datasetLeadsError) {
              console.error(`Error counting leads for dataset ${stat.dataset_id}:`, datasetLeadsError);
            } else {
              leadsByDataset[stat.dataset_id] = datasetCount || 0;
            }
          }
        }
      }

      console.log('📊 Leads grouped by dataset:', leadsByDataset);

      // 4. Transformer les données
      const statsData: DatasetProcessingStats[] = (webhookStats || []).map(stat => ({
        dataset_id: stat.dataset_id,
        processing_date: stat.started_at.split('T')[0],
        total_records: stat.total_received || 0,
        raw_posts_stored: stat.stored_raw || 0,
        posts_stored: stat.successfully_inserted || 0,
        leads_created: leadsByDataset[stat.dataset_id] || 0
      }));

      // 5. Calculer les stats globales
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
        leads_created: totalLeadsCount, // Utilise le count exact
        datasets_processed: statsData.length
      };

      console.log('📊 Final global stats:', globalStatsData);

      setGlobalStats([globalStatsData]);
      setEvolutionData(statsData);
      setDatasetHistory(statsData);
      
      const uniqueDatasets = Array.from(new Set(statsData.map(s => s.dataset_id))).sort();
      setDatasetsList(uniqueDatasets);

    } catch (error) {
      console.error('Error fetching stats:', error);
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

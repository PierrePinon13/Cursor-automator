
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

  // Fonction simple pour compter les leads
  const countLeadsForDataset = async (datasetId: string): Promise<number> => {
    try {
      const { count } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('apify_dataset_id', datasetId);
      
      return count || 0;
    } catch (error) {
      console.error('Error counting leads for dataset:', datasetId, error);
      return 0;
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const dateFilter = getDateFilter(timePeriod);
      console.log('🔍 Fetching stats for period:', timePeriod, 'Date filter:', dateFilter);
      
      // Requête simple pour les webhook stats
      let webhookQuery = supabase
        .from('apify_webhook_stats')
        .select('dataset_id, started_at, total_received, stored_raw, successfully_inserted');

      // Filtres simples
      if (dateFilter && timePeriod !== 'all') {
        webhookQuery = webhookQuery.gte('started_at', dateFilter);
      }

      if (selectedDatasetId) {
        webhookQuery = webhookQuery.eq('dataset_id', selectedDatasetId);
      }

      const { data: webhookStats, error: webhookError } = await webhookQuery
        .order('started_at', { ascending: false });

      if (webhookError) {
        console.error('❌ Error fetching webhook stats:', webhookError);
        throw webhookError;
      }

      console.log('📊 Webhook stats found:', webhookStats?.length || 0);

      // Traitement séquentiel simple
      const statsWithLeads: DatasetProcessingStats[] = [];

      if (webhookStats && webhookStats.length > 0) {
        for (const stat of webhookStats) {
          const leadsCount = await countLeadsForDataset(stat.dataset_id);
          
          statsWithLeads.push({
            dataset_id: stat.dataset_id,
            processing_date: stat.started_at.split('T')[0],
            total_records: stat.total_received || 0,
            raw_posts_stored: stat.stored_raw || 0,
            posts_stored: stat.successfully_inserted || 0,
            leads_created: leadsCount
          });
        }
      }

      // Calcul des stats globales
      const totalRecords = statsWithLeads.reduce((sum, s) => sum + s.total_records, 0);
      const totalRawPosts = statsWithLeads.reduce((sum, s) => sum + s.raw_posts_stored, 0);
      const totalPosts = statsWithLeads.reduce((sum, s) => sum + s.posts_stored, 0);
      const totalLeads = statsWithLeads.reduce((sum, s) => sum + s.leads_created, 0);
      const datasetsCount = statsWithLeads.length;

      const globalStatsData: GlobalProcessingStats = {
        period: selectedDatasetId 
          ? `Dataset ${selectedDatasetId.substring(0, 8)}...` 
          : `Derniers ${timePeriod}`,
        total_records: totalRecords,
        raw_posts_stored: totalRawPosts,
        posts_stored: totalPosts,
        leads_created: totalLeads,
        datasets_processed: datasetsCount
      };

      // Mise à jour des états
      setGlobalStats([globalStatsData]);
      setEvolutionData(statsWithLeads);
      
      // Historique trié par date
      const sortedHistory = [...statsWithLeads].sort((a, b) => 
        new Date(b.processing_date).getTime() - new Date(a.processing_date).getTime()
      );
      setDatasetHistory(sortedHistory);

      // Liste des datasets uniques
      const uniqueDatasets = Array.from(new Set(statsWithLeads.map(s => s.dataset_id))).sort();
      setDatasetsList(uniqueDatasets);

    } catch (error) {
      console.error('💥 Error fetching dataset processing stats:', error);
      // Valeurs par défaut en cas d'erreur
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

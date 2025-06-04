
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

  const getDateFilter = (period: string) => {
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
      console.log('🔍 Fetching stats for period:', timePeriod, 'Date filter:', dateFilter);
      
      // Récupérer les stats des webhooks avec filtre de période
      let webhookQuery = supabase
        .from('apify_webhook_stats')
        .select('dataset_id, started_at, total_received, stored_raw, successfully_inserted');

      if (dateFilter && timePeriod !== 'all') {
        webhookQuery = webhookQuery.gte('started_at', dateFilter);
      }

      // Si un dataset spécifique est sélectionné
      if (selectedDatasetId) {
        webhookQuery = webhookQuery.eq('dataset_id', selectedDatasetId);
      }

      const { data: webhookStats, error: webhookError } = await webhookQuery.order('started_at', { ascending: false });

      if (webhookError) {
        console.error('❌ Error fetching webhook stats:', webhookError);
        throw webhookError;
      }

      console.log('📊 Webhook stats found:', webhookStats?.length);

      // Pour chaque dataset, compter les leads créés dans la table leads
      const statsWithLeads: DatasetProcessingStats[] = [];

      if (webhookStats && webhookStats.length > 0) {
        for (const stat of webhookStats) {
          console.log('📈 Processing dataset:', stat.dataset_id);
          
          // Compter les leads créés pour ce dataset spécifique - simplifier la requête
          const { data: leadsData, error: leadsError } = await supabase
            .from('leads')
            .select('id')
            .eq('apify_dataset_id', stat.dataset_id);

          if (leadsError) {
            console.error('❌ Error counting leads for dataset', stat.dataset_id, ':', leadsError);
          }

          const leadsCount = leadsData?.length || 0;
          console.log('👥 Leads found for', stat.dataset_id, ':', leadsCount);

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

      console.log('📋 Final stats with leads:', statsWithLeads);

      // Si on filtre par dataset, on ne garde que celui-ci
      const filteredStats = selectedDatasetId 
        ? statsWithLeads.filter(s => s.dataset_id === selectedDatasetId)
        : statsWithLeads;

      // Calculer les stats globales
      const globalStatsData = filteredStats.reduce(
        (acc, stat) => ({
          period: selectedDatasetId ? `Dataset ${selectedDatasetId.substring(0, 8)}...` : `Derniers ${timePeriod}`,
          total_records: acc.total_records + stat.total_records,
          raw_posts_stored: acc.raw_posts_stored + stat.raw_posts_stored,
          posts_stored: acc.posts_stored + stat.posts_stored,
          leads_created: acc.leads_created + stat.leads_created,
          datasets_processed: acc.datasets_processed + 1
        }),
        {
          period: selectedDatasetId ? `Dataset ${selectedDatasetId.substring(0, 8)}...` : `Derniers ${timePeriod}`,
          total_records: 0,
          raw_posts_stored: 0,
          posts_stored: 0,
          leads_created: 0,
          datasets_processed: 0
        }
      );

      setGlobalStats([globalStatsData]);
      setEvolutionData(filteredStats);
      
      // Pour l'historique, on affiche tous les datasets (pas de filtre)
      const allHistory = [...statsWithLeads].sort((a, b) => 
        new Date(b.processing_date).getTime() - new Date(a.processing_date).getTime()
      );
      setDatasetHistory(allHistory);

      // Liste des datasets uniques
      const uniqueDatasets = [...new Set(statsWithLeads.map(s => s.dataset_id))].sort();
      setDatasetsList(uniqueDatasets);

    } catch (error) {
      console.error('💥 Error fetching dataset processing stats:', error);
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

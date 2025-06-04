
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
      
      // Requête pour les webhook stats
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

      // ✅ CORRECTION : Requête simplifiée pour les leads avec gestion d'erreur
      let leadsQuery = supabase
        .from('leads')
        .select('apify_dataset_id, created_at');

      if (dateFilter && timePeriod !== 'all') {
        leadsQuery = leadsQuery.gte('created_at', dateFilter);
      }

      if (selectedDatasetId) {
        leadsQuery = leadsQuery.eq('apify_dataset_id', selectedDatasetId);
      }

      const { data: leadsData, error: leadsError } = await leadsQuery;

      if (leadsError) {
        console.error('Error fetching leads data:', leadsError);
        // Ne pas faire échouer complètement la requête si les leads échouent
      }

      console.log('✅ Fetched leads data with dataset_id:', leadsData?.length || 0);

      // Grouper les leads par dataset_id (seulement si on a des données)
      const leadsByDataset: Record<string, number> = {};
      if (leadsData && !leadsError) {
        leadsData.forEach(lead => {
          const datasetId = lead.apify_dataset_id;
          if (datasetId) {
            leadsByDataset[datasetId] = (leadsByDataset[datasetId] || 0) + 1;
          }
        });
      }

      console.log('📊 Leads grouped by dataset:', leadsByDataset);

      // Transformer les données
      const statsData: DatasetProcessingStats[] = (webhookStats || []).map(stat => ({
        dataset_id: stat.dataset_id,
        processing_date: stat.started_at.split('T')[0],
        total_records: stat.total_received || 0,
        raw_posts_stored: stat.stored_raw || 0,
        posts_stored: stat.successfully_inserted || 0,
        leads_created: leadsByDataset[stat.dataset_id] || 0 // ✅ CORRECTION : Utiliser le vrai count par dataset
      }));

      // Stats globales - totaux réels
      const totalRecords = statsData.reduce((sum, s) => sum + s.total_records, 0);
      const totalRawPosts = statsData.reduce((sum, s) => sum + s.raw_posts_stored, 0);
      const totalPosts = statsData.reduce((sum, s) => sum + s.posts_stored, 0);
      const totalLeads = statsData.reduce((sum, s) => sum + s.leads_created, 0); // ✅ CORRECTION

      const globalStatsData: GlobalProcessingStats = {
        period: selectedDatasetId 
          ? `Dataset ${selectedDatasetId.substring(0, 8)}...` 
          : `Derniers ${timePeriod}`,
        total_records: totalRecords,
        raw_posts_stored: totalRawPosts,
        posts_stored: totalPosts,
        leads_created: totalLeads, // ✅ CORRECTION : Utiliser la somme réelle
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

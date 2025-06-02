
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Database, FileText, Target, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ProcessingStat {
  id: string;
  dataset_id: string;
  total_received: number;
  stored_raw: number;
  successfully_inserted: number;
  processing_errors: number;
  started_at: string;
  completed_at?: string;
  created_at: string;
}

interface DatasetStats {
  dataset_id: string;
  executions: ProcessingStat[];
  total_posts: number;
  success_rate: number;
  latest_execution: string;
}

const ProcessingStatsSection = () => {
  const [stats, setStats] = useState<ProcessingStat[]>([]);
  const [datasetStats, setDatasetStats] = useState<DatasetStats[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('apify_webhook_stats')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setStats(data || []);

      // Group by dataset
      const grouped = (data || []).reduce((acc, stat) => {
        if (!acc[stat.dataset_id]) {
          acc[stat.dataset_id] = [];
        }
        acc[stat.dataset_id].push(stat);
        return acc;
      }, {} as Record<string, ProcessingStat[]>);

      const datasetSummary = Object.entries(grouped).map(([datasetId, executions]) => {
        const totalPosts = executions.reduce((sum, exec) => sum + exec.total_received, 0);
        const totalSuccess = executions.reduce((sum, exec) => sum + exec.successfully_inserted, 0);
        const successRate = totalPosts > 0 ? (totalSuccess / totalPosts) * 100 : 0;
        const latestExecution = executions[0]?.created_at || '';

        return {
          dataset_id: datasetId,
          executions: executions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
          total_posts: totalPosts,
          success_rate: successRate,
          latest_execution: latestExecution
        };
      }).sort((a, b) => new Date(b.latest_execution).getTime() - new Date(a.latest_execution).getTime());

      setDatasetStats(datasetSummary);
    } catch (error) {
      console.error('Error fetching processing stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const filteredStats = selectedDataset 
    ? stats.filter(stat => stat.dataset_id === selectedDataset)
    : stats;

  const calculateFilteringRate = (before: number, after: number) => {
    if (before === 0) return 0;
    return Math.round(((before - after) / before) * 100);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des statistiques...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Statistiques de traitement</h3>
          <p className="text-sm text-muted-foreground">
            {selectedDataset ? `Dataset: ${selectedDataset.substring(0, 8)}...` : 'Tous les datasets'}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedDataset && (
            <Button 
              onClick={() => setSelectedDataset(null)} 
              variant="outline" 
              size="sm"
            >
              Voir tous
            </Button>
          )}
          <Button onClick={fetchStats} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {!selectedDataset && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-500" />
              Résumé par Dataset
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {datasetStats.map((dataset) => (
                <div 
                  key={dataset.dataset_id}
                  className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setSelectedDataset(dataset.dataset_id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">
                        Dataset: {dataset.dataset_id.substring(0, 12)}...
                      </h4>
                      <p className="text-sm text-gray-600">
                        {dataset.executions.length} exécutions • {dataset.total_posts} posts traités
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={dataset.success_rate > 80 ? "default" : "secondary"}>
                        {dataset.success_rate.toFixed(1)}% succès
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        Dernière: {format(new Date(dataset.latest_execution), 'dd/MM HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Historique des exécutions
            {selectedDataset && (
              <Badge variant="outline" className="ml-2">
                {selectedDataset.substring(0, 8)}...
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredStats.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Aucune statistique disponible
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Dataset ID</TableHead>
                  <TableHead>Reçus</TableHead>
                  <TableHead>Stockés Raw</TableHead>
                  <TableHead>Insérés</TableHead>
                  <TableHead>Taux Rejet</TableHead>
                  <TableHead>Erreurs</TableHead>
                  <TableHead>Durée</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStats.map((stat) => (
                  <TableRow key={stat.id}>
                    <TableCell>
                      {format(new Date(stat.created_at), 'dd/MM HH:mm', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-1 rounded">
                        {stat.dataset_id.substring(0, 8)}...
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">{stat.total_received}</TableCell>
                    <TableCell className="font-medium text-purple-600">{stat.stored_raw}</TableCell>
                    <TableCell className="font-medium text-green-600">{stat.successfully_inserted}</TableCell>
                    <TableCell>
                      <Badge variant={calculateFilteringRate(stat.total_received, stat.successfully_inserted) > 50 ? "destructive" : "outline"}>
                        {calculateFilteringRate(stat.total_received, stat.successfully_inserted)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {stat.processing_errors > 0 && (
                        <Badge variant="destructive">{stat.processing_errors}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {stat.completed_at && (
                        <span className="text-sm text-gray-600">
                          {Math.round((new Date(stat.completed_at).getTime() - new Date(stat.started_at).getTime()) / 1000)}s
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcessingStatsSection;

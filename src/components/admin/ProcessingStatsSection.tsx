import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Database, Calendar, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
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

interface DatasetInfo {
  dataset_id: string;
  first_execution: string;
  last_execution: string;
  total_executions: number;
  total_posts_processed: number;
  avg_success_rate: number;
}

interface GlobalStats {
  period: string;
  total_executions: number;
  total_posts: number;
  total_success: number;
  avg_success_rate: number;
  total_errors: number;
}

type ViewMode = 'global' | 'dataset';
type TimePeriod = '24h' | '7d' | '30d' | 'all';

const ProcessingStatsSection = () => {
  const [stats, setStats] = useState<ProcessingStat[]>([]);
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('global');
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('7d');
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

  const fetchStats = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('apify_webhook_stats')
        .select('*')
        .order('created_at', { ascending: false });

      const dateFilter = getDateFilter(timePeriod);
      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      
      setStats(data || []);

      // Calculer les datasets
      const datasetMap = new Map<string, DatasetInfo>();
      (data || []).forEach(stat => {
        if (!datasetMap.has(stat.dataset_id)) {
          datasetMap.set(stat.dataset_id, {
            dataset_id: stat.dataset_id,
            first_execution: stat.created_at,
            last_execution: stat.created_at,
            total_executions: 0,
            total_posts_processed: 0,
            avg_success_rate: 0
          });
        }
        
        const info = datasetMap.get(stat.dataset_id)!;
        info.total_executions++;
        info.total_posts_processed += stat.total_received;
        
        if (stat.created_at < info.first_execution) {
          info.first_execution = stat.created_at;
        }
        if (stat.created_at > info.last_execution) {
          info.last_execution = stat.created_at;
        }
      });

      // Calculer les taux de succès
      datasetMap.forEach((info, datasetId) => {
        const datasetStats = (data || []).filter(s => s.dataset_id === datasetId);
        const totalReceived = datasetStats.reduce((sum, s) => sum + s.total_received, 0);
        const totalSuccess = datasetStats.reduce((sum, s) => sum + s.successfully_inserted, 0);
        info.avg_success_rate = totalReceived > 0 ? (totalSuccess / totalReceived) * 100 : 0;
      });

      setDatasets(Array.from(datasetMap.values()).sort((a, b) => 
        new Date(b.last_execution).getTime() - new Date(a.last_execution).getTime()
      ));

      // Calculer les stats globales par période
      if (viewMode === 'global') {
        const periodGroups = new Map<string, ProcessingStat[]>();
        
        (data || []).forEach(stat => {
          let periodKey: string;
          const date = new Date(stat.created_at);
          
          switch (timePeriod) {
            case '24h':
              periodKey = format(date, 'HH:mm', { locale: fr });
              break;
            case '7d':
              periodKey = format(date, 'dd/MM', { locale: fr });
              break;
            case '30d':
              periodKey = format(date, 'dd/MM', { locale: fr });
              break;
            default:
              periodKey = format(date, 'MM/yyyy', { locale: fr });
              break;
          }
          
          if (!periodGroups.has(periodKey)) {
            periodGroups.set(periodKey, []);
          }
          periodGroups.get(periodKey)!.push(stat);
        });

        const globalStatsData: GlobalStats[] = Array.from(periodGroups.entries()).map(([period, stats]) => {
          const totalPosts = stats.reduce((sum, s) => sum + s.total_received, 0);
          const totalSuccess = stats.reduce((sum, s) => sum + s.successfully_inserted, 0);
          const totalErrors = stats.reduce((sum, s) => sum + s.processing_errors, 0);
          
          return {
            period,
            total_executions: stats.length,
            total_posts: totalPosts,
            total_success: totalSuccess,
            avg_success_rate: totalPosts > 0 ? (totalSuccess / totalPosts) * 100 : 0,
            total_errors: totalErrors
          };
        }).sort((a, b) => a.period.localeCompare(b.period));

        setGlobalStats(globalStatsData);
      }

    } catch (error) {
      console.error('Error fetching processing stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [viewMode, timePeriod, selectedDataset]);

  const filteredStats = selectedDataset && viewMode === 'dataset'
    ? stats.filter(stat => stat.dataset_id === selectedDataset)
    : stats;

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
        <h3 className="text-lg font-semibold">Statistiques d'exécutions</h3>
        <div className="flex gap-2">
          <Select value={viewMode} onValueChange={(value: ViewMode) => {
            setViewMode(value);
            if (value === 'global') setSelectedDataset(null);
          }}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Vue globale</SelectItem>
              <SelectItem value="dataset">Par dataset</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={timePeriod} onValueChange={(value: TimePeriod) => setTimePeriod(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24h</SelectItem>
              <SelectItem value="7d">7 jours</SelectItem>
              <SelectItem value="30d">30 jours</SelectItem>
              <SelectItem value="all">Tout</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={fetchStats} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {viewMode === 'global' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Statistiques globales par période
            </CardTitle>
          </CardHeader>
          <CardContent>
            {globalStats.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Aucune donnée disponible</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Période</TableHead>
                    <TableHead>Exécutions</TableHead>
                    <TableHead>Posts traités</TableHead>
                    <TableHead>Succès</TableHead>
                    <TableHead>Taux de succès</TableHead>
                    <TableHead>Erreurs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {globalStats.map((stat, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{stat.period}</TableCell>
                      <TableCell>{stat.total_executions}</TableCell>
                      <TableCell className="font-medium">{stat.total_posts}</TableCell>
                      <TableCell className="text-green-600 font-medium">{stat.total_success}</TableCell>
                      <TableCell>
                        <Badge variant={stat.avg_success_rate > 80 ? "default" : "secondary"}>
                          {stat.avg_success_rate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {stat.total_errors > 0 && (
                          <Badge variant="destructive">{stat.total_errors}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {viewMode === 'dataset' && !selectedDataset && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-500" />
              Datasets disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {datasets.map((dataset) => (
                <div 
                  key={dataset.dataset_id}
                  className="p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 hover:border-blue-200"
                  onClick={() => setSelectedDataset(dataset.dataset_id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">
                        Dataset: {dataset.dataset_id.substring(0, 12)}...
                      </h4>
                      <p className="text-sm text-gray-600">
                        {dataset.total_executions} exécutions • {dataset.total_posts_processed} posts
                      </p>
                      <p className="text-xs text-gray-500">
                        Première: {format(new Date(dataset.first_execution), 'dd/MM/yyyy HH:mm', { locale: fr })} • 
                        Dernière: {format(new Date(dataset.last_execution), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </p>
                    </div>
                    <Badge variant={dataset.avg_success_rate > 80 ? "default" : "secondary"}>
                      {dataset.avg_success_rate.toFixed(1)}% succès
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === 'dataset' && selectedDataset && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Historique des exécutions - {selectedDataset.substring(0, 8)}...
              <Button
                onClick={() => setSelectedDataset(null)}
                variant="outline"
                size="sm"
                className="ml-auto"
              >
                Retour à la liste
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredStats.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Aucune exécution trouvée pour ce dataset</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reçus</TableHead>
                    <TableHead>Stockés Raw</TableHead>
                    <TableHead>Insérés</TableHead>
                    <TableHead>Taux succès</TableHead>
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
                      <TableCell className="font-medium">{stat.total_received}</TableCell>
                      <TableCell className="text-purple-600">{stat.stored_raw}</TableCell>
                      <TableCell className="text-green-600 font-medium">{stat.successfully_inserted}</TableCell>
                      <TableCell>
                        <Badge variant={
                          stat.total_received > 0 && 
                          (stat.successfully_inserted / stat.total_received) > 0.8 ? "default" : "secondary"
                        }>
                          {stat.total_received > 0 ? 
                            ((stat.successfully_inserted / stat.total_received) * 100).toFixed(1) : 0}%
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
      )}
    </div>
  );
};

export default ProcessingStatsSection;

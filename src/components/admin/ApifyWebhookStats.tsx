
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Download, TrendingDown, Filter, Database } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ApifyWebhookStat {
  id: string;
  dataset_id: string;
  total_received: number;
  after_person_filter: number;
  after_repost_filter: number;
  after_required_fields_filter: number;
  after_deduplication: number;
  successfully_inserted: number;
  processing_errors: number;
  started_at: string;
  completed_at?: string;
  created_at: string;
}

export default function ApifyWebhookStats() {
  const [stats, setStats] = useState<ApifyWebhookStat[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('apify_webhook_stats')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setStats(data || []);
    } catch (error) {
      console.error('Error fetching webhook stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const calculateFilteringRate = (before: number, after: number) => {
    if (before === 0) return 0;
    return Math.round(((before - after) / before) * 100);
  };

  const getFilteringColor = (rate: number) => {
    if (rate > 50) return 'destructive';
    if (rate > 20) return 'secondary';
    return 'outline';
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

  const latestStats = stats[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Statistiques des Webhooks Apify</h3>
        <Button onClick={fetchStats} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {latestStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Dernière exécution</p>
                  <p className="text-lg font-semibold">{latestStats.total_received}</p>
                  <p className="text-xs text-gray-500">records reçus</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-600">Après filtres</p>
                  <p className="text-lg font-semibold">{latestStats.after_deduplication}</p>
                  <p className="text-xs text-gray-500">records traités</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-sm text-gray-600">Taux de filtrage</p>
                  <p className="text-lg font-semibold">
                    {calculateFilteringRate(latestStats.total_received, latestStats.successfully_inserted)}%
                  </p>
                  <p className="text-xs text-gray-500">données filtrées</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Insérés</p>
                  <p className="text-lg font-semibold">{latestStats.successfully_inserted}</p>
                  <p className="text-xs text-gray-500">nouveaux posts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Historique des exécutions</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.length === 0 ? (
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
                  <TableHead>Person</TableHead>
                  <TableHead>Repost</TableHead>
                  <TableHead>Champs</TableHead>
                  <TableHead>Dédup</TableHead>
                  <TableHead>Insérés</TableHead>
                  <TableHead>Erreurs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((stat) => (
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
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {stat.after_person_filter}
                        <Badge variant={getFilteringColor(calculateFilteringRate(stat.total_received, stat.after_person_filter))} className="text-xs">
                          -{calculateFilteringRate(stat.total_received, stat.after_person_filter)}%
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {stat.after_repost_filter}
                        <Badge variant={getFilteringColor(calculateFilteringRate(stat.after_person_filter, stat.after_repost_filter))} className="text-xs">
                          -{calculateFilteringRate(stat.after_person_filter, stat.after_repost_filter)}%
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {stat.after_required_fields_filter}
                        <Badge variant={getFilteringColor(calculateFilteringRate(stat.after_repost_filter, stat.after_required_fields_filter))} className="text-xs">
                          -{calculateFilteringRate(stat.after_repost_filter, stat.after_required_fields_filter)}%
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {stat.after_deduplication}
                        <Badge variant={getFilteringColor(calculateFilteringRate(stat.after_required_fields_filter, stat.after_deduplication))} className="text-xs">
                          -{calculateFilteringRate(stat.after_required_fields_filter, stat.after_deduplication)}%
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      {stat.successfully_inserted}
                    </TableCell>
                    <TableCell>
                      {stat.processing_errors > 0 && (
                        <Badge variant="destructive">{stat.processing_errors}</Badge>
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
}

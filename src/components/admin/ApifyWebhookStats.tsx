import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Database, FileText, Target, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ApifyWebhookStat {
  id: string;
  dataset_id: string;
  total_received: number;
  stored_raw: number;
  queued_for_processing?: number;
  processing_errors: number;
  started_at: string;
  completed_at?: string;
  created_at: string;
  classification_success_rate?: number;
  storage_success_rate?: number;
  // Legacy fields for backward compatibility
  after_person_filter?: number;
  after_repost_filter?: number;
  after_required_fields_filter?: number;
  after_deduplication?: number;
  successfully_inserted?: number;
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
  const isNewArchitecture = latestStats?.queued_for_processing !== undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Statistiques des Webhooks Apify</h3>
          <p className="text-sm text-muted-foreground">
            {isNewArchitecture ? '🎯 Nouvelle Architecture - Stockage Universel' : '📊 Architecture Héritée'}
          </p>
        </div>
        <Button onClick={fetchStats} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {latestStats && (
        <>
          {isNewArchitecture ? (
            // Nouvelle architecture - Phase 1
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-600">Reçus Total</p>
                      <p className="text-lg font-semibold">{latestStats.total_received}</p>
                      <p className="text-xs text-gray-500">Dataset: {latestStats.dataset_id.substring(0, 8)}...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-sm text-gray-600">Stockage Universel</p>
                      <p className="text-lg font-semibold">{latestStats.stored_raw}</p>
                      <p className="text-xs text-green-600">
                        {latestStats.storage_success_rate}% succès
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-sm text-gray-600">Queue Processing</p>
                      <p className="text-lg font-semibold">{latestStats.queued_for_processing || 0}</p>
                      <p className="text-xs text-green-600">
                        {latestStats.classification_success_rate}% classifiés
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="text-sm text-gray-600">Erreurs</p>
                      <p className="text-lg font-semibold">{latestStats.processing_errors}</p>
                      <p className="text-xs text-gray-500">erreurs de traitement</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            // Architecture héritée
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-600">Reçus</p>
                      <p className="text-lg font-semibold">{latestStats.total_received}</p>
                      <p className="text-xs text-gray-500">total Apify</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-sm text-gray-600">Stockés Raw</p>
                      <p className="text-lg font-semibold">{latestStats.stored_raw}</p>
                      <p className="text-xs text-gray-500">en raw table</p>
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
                      <p className="text-lg font-semibold">{latestStats.after_required_fields_filter}</p>
                      <p className="text-xs text-gray-500">validés</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="text-sm text-gray-600">Taux rejet</p>
                      <p className="text-lg font-semibold">
                        {calculateFilteringRate(latestStats.total_received, latestStats.successfully_inserted)}%
                      </p>
                      <p className="text-xs text-gray-500">données rejetées</p>
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
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Historique des exécutions par Dataset
          </CardTitle>
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
                  <TableHead>Architecture</TableHead>
                  <TableHead>Reçus</TableHead>
                  <TableHead>Stockés</TableHead>
                  <TableHead>Traitement</TableHead>
                  <TableHead>Taux Succès</TableHead>
                  <TableHead>Erreurs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((stat) => {
                  const isNew = stat.queued_for_processing !== undefined;
                  return (
                    <TableRow key={stat.id}>
                      <TableCell>
                        {format(new Date(stat.created_at), 'dd/MM HH:mm', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-1 rounded">
                          {stat.dataset_id.substring(0, 8)}...
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isNew ? "default" : "secondary"}>
                          {isNew ? '🎯 Nouvelle' : '📊 Héritée'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{stat.total_received}</TableCell>
                      <TableCell className="font-medium text-purple-600">
                        {stat.stored_raw}
                        {stat.storage_success_rate && (
                          <div className="text-xs text-green-600">
                            {stat.storage_success_rate}%
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-green-600">
                        {isNew ? (
                          <>
                            {stat.queued_for_processing || 0}
                            {stat.classification_success_rate && (
                              <div className="text-xs text-green-600">
                                {stat.classification_success_rate}%
                              </div>
                            )}
                          </>
                        ) : (
                          stat.successfully_inserted || 0
                        )}
                      </TableCell>
                      <TableCell>
                        {isNew ? (
                          <div className="text-sm">
                            <div className="text-green-600">Stockage: {stat.storage_success_rate}%</div>
                            <div className="text-blue-600">Classif: {stat.classification_success_rate}%</div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">Legacy</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {stat.processing_errors > 0 && (
                          <Badge variant="destructive">{stat.processing_errors}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const calculateFilteringRate = (before: number, after: number) => {
  if (before === 0) return 0;
  return Math.round(((before - after) / before) * 100);
};

const getFilteringColor = (rate: number) => {
  if (rate > 50) return 'destructive';
  if (rate > 20) return 'secondary';
  return 'outline';
};

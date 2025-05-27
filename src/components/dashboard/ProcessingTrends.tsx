
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useProcessingMetricsHistory } from '@/hooks/useProcessingMetricsHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ProcessingTrends = () => {
  const { metricsHistory: last24h, loading: loading24h } = useProcessingMetricsHistory(24);
  const { metricsHistory: last7days, loading: loading7days } = useProcessingMetricsHistory(168);

  const formatVolumeData = (data: any[]) => {
    return data.map(point => ({
      time: new Date(point.hour_timestamp).toLocaleDateString('fr-FR', {
        month: 'short',
        day: 'numeric',
        hour: data.length <= 24 ? '2-digit' : undefined
      }),
      completed: point.posts_completed,
      failed: point.posts_failed,
      processing: point.posts_in_processing,
      total: point.total_posts_processed,
    }));
  };

  const formatPerformanceData = (data: any[]) => {
    return data.map(point => ({
      time: new Date(point.hour_timestamp).toLocaleDateString('fr-FR', {
        month: 'short',
        day: 'numeric',
        hour: data.length <= 24 ? '2-digit' : undefined
      }),
      avgTime: point.avg_processing_time_minutes,
      errorRate: point.error_rate,
      duplicateRate: point.duplicate_rate,
    }));
  };

  if (loading24h || loading7days) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendances de Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="volume" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="volume">Volume</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="quality">Qualité</TabsTrigger>
          </TabsList>

          <TabsContent value="volume" className="space-y-4">
            <Tabs defaultValue="24h">
              <TabsList>
                <TabsTrigger value="24h">Dernières 24h</TabsTrigger>
                <TabsTrigger value="7days">7 derniers jours</TabsTrigger>
              </TabsList>
              
              <TabsContent value="24h">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={formatVolumeData(last24h)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="completed" stackId="a" fill="#16a34a" name="Complétés" />
                    <Bar dataKey="failed" stackId="a" fill="#dc2626" name="Échecs" />
                    <Bar dataKey="processing" stackId="a" fill="#eab308" name="En cours" />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
              
              <TabsContent value="7days">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={formatVolumeData(last7days.filter((_, i) => i % 6 === 0))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="completed" stackId="a" fill="#16a34a" name="Complétés" />
                    <Bar dataKey="failed" stackId="a" fill="#dc2626" name="Échecs" />
                    <Bar dataKey="processing" stackId="a" fill="#eab308" name="En cours" />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="performance">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={formatPerformanceData(last24h)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'avgTime' ? `${value?.toFixed(1)} min` : `${value?.toFixed(1)}%`,
                    name === 'avgTime' ? 'Temps moyen' : 'Taux d\'erreur'
                  ]}
                />
                <Bar dataKey="avgTime" fill="#2563eb" name="Temps moyen (min)" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="quality">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={formatPerformanceData(last24h)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value: number) => `${value?.toFixed(1)}%`} />
                <Bar dataKey="errorRate" fill="#dc2626" name="Taux d'erreur %" />
                <Bar dataKey="duplicateRate" fill="#f59e0b" name="Taux de doublons %" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ProcessingTrends;

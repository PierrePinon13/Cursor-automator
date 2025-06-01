
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface DiagnosticData {
  webhook_stats: any[];
  raw_posts_today: number;
  filtered_posts_today: number;
  processed_posts_today: number;
  leads_created_today: number;
  processing_status_breakdown: any[];
  hourly_breakdown: any[];
}

export default function DataProcessingDiagnostics() {
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnostics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const targetTime = '2025-06-01T09:25:00'; // 10h25 Paris time = 9h25 UTC
      const timeWindow = '2025-06-01T08:00:00'; // 2 hour window around target time
      const timeWindowEnd = '2025-06-01T11:00:00';

      console.log('🔍 Analyzing data for today:', today);
      console.log('🕒 Target time window:', timeWindow, 'to', timeWindowEnd);

      // 1. Webhook stats for today
      const { data: webhookStats, error: webhookError } = await supabase
        .from('apify_webhook_stats')
        .select('*')
        .gte('created_at', today)
        .order('created_at', { ascending: false });

      if (webhookError) {
        console.error('Error fetching webhook stats:', webhookError);
      }

      // 2. Raw posts received today
      const { count: rawPostsCount, error: rawError } = await supabase
        .from('linkedin_posts_raw')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      if (rawError) {
        console.error('Error counting raw posts:', rawError);
      }

      // 3. Raw posts in target time window
      const { data: rawPostsInWindow, error: rawWindowError } = await supabase
        .from('linkedin_posts_raw')
        .select('id, created_at, urn, author_type, is_repost')
        .gte('created_at', timeWindow)
        .lte('created_at', timeWindowEnd)
        .order('created_at', { ascending: false })
        .limit(100);

      if (rawWindowError) {
        console.error('Error fetching raw posts in window:', rawWindowError);
      }

      // 4. Filtered posts (linkedin_posts) today
      const { count: filteredPostsCount, error: filteredError } = await supabase
        .from('linkedin_posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      if (filteredError) {
        console.error('Error counting filtered posts:', filteredError);
      }

      // 5. Filtered posts in target time window
      const { data: filteredPostsInWindow, error: filteredWindowError } = await supabase
        .from('linkedin_posts')
        .select('id, created_at, urn, processing_status, author_type')
        .gte('created_at', timeWindow)
        .lte('created_at', timeWindowEnd)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filteredWindowError) {
        console.error('Error fetching filtered posts in window:', filteredWindowError);
      }

      // 6. Processing status breakdown for today
      const { data: statusBreakdown, error: statusError } = await supabase
        .from('linkedin_posts')
        .select('processing_status')
        .gte('created_at', today);

      if (statusError) {
        console.error('Error fetching status breakdown:', statusError);
      }

      // 7. Leads created today
      const { count: leadsCount, error: leadsError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      if (leadsError) {
        console.error('Error counting leads:', leadsError);
      }

      // 8. Hourly breakdown for today
      const { data: hourlyData, error: hourlyError } = await supabase
        .rpc('get_hourly_processing_breakdown', { target_date: today });

      if (hourlyError) {
        console.error('Error fetching hourly breakdown:', hourlyError);
      }

      // Process status breakdown
      const statusCounts = statusBreakdown?.reduce((acc, post) => {
        const status = post.processing_status || 'pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      setData({
        webhook_stats: webhookStats || [],
        raw_posts_today: rawPostsCount || 0,
        filtered_posts_today: filteredPostsCount || 0,
        processed_posts_today: filteredPostsInWindow?.length || 0,
        leads_created_today: leadsCount || 0,
        processing_status_breakdown: Object.entries(statusCounts).map(([status, count]) => ({
          status,
          count
        })),
        hourly_breakdown: hourlyData || []
      });

      console.log('📊 Diagnostic data:', {
        webhookStats: webhookStats?.length,
        rawPostsCount,
        filteredPostsCount,
        leadsCount,
        rawPostsInWindow: rawPostsInWindow?.length,
        filteredPostsInWindow: filteredPostsInWindow?.length,
        statusCounts
      });

    } catch (err: any) {
      console.error('Error in diagnostics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'error':
      case 'failed_max_retries':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'error':
      case 'failed_max_retries':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Analyse des données en cours...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Erreur lors de l'analyse : {error}</p>
          <Button onClick={fetchDiagnostics} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Diagnostic du traitement des données (Aujourd'hui 10h25)</h3>
        <Button onClick={fetchDiagnostics} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{data?.raw_posts_today || 0}</div>
            <div className="text-sm text-gray-600">Posts bruts reçus (linkedin_posts_raw)</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{data?.filtered_posts_today || 0}</div>
            <div className="text-sm text-gray-600">Posts filtrés (linkedin_posts)</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{data?.leads_created_today || 0}</div>
            <div className="text-sm text-gray-600">Leads créés (leads)</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{data?.webhook_stats?.length || 0}</div>
            <div className="text-sm text-gray-600">Exécutions webhook</div>
          </CardContent>
        </Card>
      </div>

      {/* Statistiques des webhooks */}
      {data?.webhook_stats && data.webhook_stats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Exécutions du webhook Apify aujourd'hui</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.webhook_stats.map((stat, index) => (
                <div key={stat.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">
                      {new Date(stat.created_at).toLocaleTimeString('fr-FR')}
                    </Badge>
                    <span className="text-sm text-gray-500">Dataset: {stat.dataset_id?.substring(0, 8)}...</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Reçus</div>
                      <div className="text-blue-600">{stat.total_received}</div>
                    </div>
                    <div>
                      <div className="font-medium">Après filtres</div>
                      <div className="text-orange-600">{stat.after_deduplication}</div>
                    </div>
                    <div>
                      <div className="font-medium">Insérés</div>
                      <div className="text-green-600">{stat.successfully_inserted}</div>
                    </div>
                    <div>
                      <div className="font-medium">Erreurs</div>
                      <div className="text-red-600">{stat.processing_errors}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Répartition des statuts de traitement */}
      {data?.processing_status_breakdown && data.processing_status_breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Statuts de traitement (Posts filtrés)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {data.processing_status_breakdown.map(({ status, count }) => (
                <div key={status} className="flex items-center gap-2">
                  {getStatusIcon(status)}
                  <div>
                    <div className="font-medium">{status}</div>
                    <Badge variant={getStatusColor(status) as any}>{count}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analyse détaillée */}
      <Card>
        <CardHeader>
          <CardTitle>Analyse du problème</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data?.raw_posts_today === 0 ? (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>Aucun post brut reçu aujourd'hui - Le webhook n'a pas été déclenché</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>✅ Posts bruts reçus : {data?.raw_posts_today}</span>
              </div>
            )}
            
            {data?.raw_posts_today && data?.raw_posts_today > 0 && data?.filtered_posts_today === 0 ? (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>❌ Aucun post n'a passé les filtres (Person + non-repost + déduplication)</span>
              </div>
            ) : data?.filtered_posts_today && data?.filtered_posts_today > 0 ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>✅ Posts filtrés créés : {data?.filtered_posts_today}</span>
              </div>
            ) : null}
            
            {data?.filtered_posts_today && data?.filtered_posts_today > 0 && data?.leads_created_today === 0 ? (
              <div className="flex items-center gap-2 text-orange-600">
                <Clock className="h-4 w-4" />
                <span>⏳ Posts en cours de traitement - Leads pas encore créés</span>
              </div>
            ) : data?.leads_created_today && data?.leads_created_today > 0 ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>✅ Leads créés : {data?.leads_created_today}</span>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

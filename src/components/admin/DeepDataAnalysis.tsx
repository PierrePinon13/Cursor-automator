
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, AlertTriangle, Search, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DeepAnalysisData {
  apify_analysis: {
    total_sent_by_apify: number;
    received_in_raw_table: number;
    difference: number;
    possible_causes: string[];
  };
  temporal_distribution: {
    hour: string;
    raw_posts_received: number;
    filtered_posts_created: number;
    webhook_executions: number;
  }[];
  filtering_analysis: {
    total_raw_posts: number;
    person_filter_passed: number;
    non_repost_filter_passed: number;
    after_deduplication: number;
    person_filter_rejection_rate: number;
    repost_filter_rejection_rate: number;
    deduplication_rejection_rate: number;
  };
  detailed_author_types: {
    author_type: string;
    count: number;
    percentage: number;
  }[];
  repost_analysis: {
    total_posts: number;
    reposts: number;
    non_reposts: number;
    repost_percentage: number;
  };
  duplication_analysis: {
    unique_urns_raw: number;
    unique_urns_filtered: number;
    potential_duplicates: number;
  };
  webhook_execution_analysis: {
    execution_time: string;
    dataset_id: string;
    total_received: number;
    successfully_inserted: number;
    processing_errors: number;
  }[];
}

export default function DeepDataAnalysis() {
  const [data, setData] = useState<DeepAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDeepAnalysis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const today = '2025-06-01';
      console.log('🔍 Analyse approfondie pour le', today);

      // 1. Analyse Apify vs Données reçues
      const { count: rawPostsReceived, error: rawCountError } = await supabase
        .from('linkedin_posts_raw')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today)
        .lt('created_at', '2025-06-02');

      console.log('📊 Posts bruts reçus:', rawPostsReceived);

      // 2. Distribution temporelle détaillée
      const { data: temporalData, error: temporalError } = await supabase
        .from('linkedin_posts_raw')
        .select('created_at, id')
        .gte('created_at', today)
        .lt('created_at', '2025-06-02')
        .order('created_at');

      console.log('📅 Distribution temporelle:', temporalData?.length);

      // 3. Analyse des types d'auteurs
      const { data: authorTypes, error: authorError } = await supabase
        .from('linkedin_posts_raw')
        .select('author_type')
        .gte('created_at', today)
        .lt('created_at', '2025-06-02');

      console.log('👥 Types d\'auteurs:', authorTypes?.length);

      // 4. Analyse des reposts
      const { data: repostData, error: repostError } = await supabase
        .from('linkedin_posts_raw')
        .select('is_repost')
        .gte('created_at', today)
        .lt('created_at', '2025-06-02');

      console.log('🔁 Données reposts:', repostData?.length);

      // 5. Analyse de déduplication - URNs uniques
      const { data: uniqueUrns, error: urnError } = await supabase
        .from('linkedin_posts_raw')
        .select('urn')
        .gte('created_at', today)
        .lt('created_at', '2025-06-02');

      console.log('🔗 URNs uniques:', uniqueUrns?.length);

      // 6. Posts filtrés créés
      const { count: filteredPostsCount, error: filteredError } = await supabase
        .from('linkedin_posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today)
        .lt('created_at', '2025-06-02');

      console.log('✅ Posts filtrés créés:', filteredPostsCount);

      // 7. Statistiques des webhooks
      const { data: webhookStats, error: webhookError } = await supabase
        .from('apify_webhook_stats')
        .select('*')
        .gte('created_at', today)
        .lt('created_at', '2025-06-02')
        .order('created_at');

      console.log('🔗 Stats webhooks:', webhookStats?.length);

      // Traitement des données
      const authorTypeCounts = authorTypes?.reduce((acc, post) => {
        const type = post.author_type || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const totalPosts = authorTypes?.length || 0;
      const detailedAuthorTypes = Object.entries(authorTypeCounts).map(([type, count]) => ({
        author_type: type,
        count,
        percentage: totalPosts > 0 ? (count / totalPosts) * 100 : 0
      }));

      const repostCounts = repostData?.reduce((acc, post) => {
        if (post.is_repost) acc.reposts++;
        else acc.non_reposts++;
        return acc;
      }, { reposts: 0, non_reposts: 0 }) || { reposts: 0, non_reposts: 0 };

      const uniqueUrnSet = new Set(uniqueUrns?.map(u => u.urn) || []);
      const potentialDuplicates = (uniqueUrns?.length || 0) - uniqueUrnSet.size;

      // Distribution temporelle par heure
      const temporalDistribution = temporalData?.reduce((acc, post) => {
        const hour = new Date(post.created_at).toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        const hourKey = hour.substring(0, 2) + 'h';
        
        if (!acc[hourKey]) {
          acc[hourKey] = { hour: hourKey, raw_posts_received: 0, filtered_posts_created: 0, webhook_executions: 0 };
        }
        acc[hourKey].raw_posts_received++;
        return acc;
      }, {} as Record<string, any>) || {};

      // Calculs de filtrage
      const personTypePosts = authorTypes?.filter(post => post.author_type === 'Person').length || 0;
      const nonRepostPosts = repostData?.filter(post => !post.is_repost).length || 0;
      const personAndNonRepostPosts = Math.min(personTypePosts, nonRepostPosts); // Approximation

      setData({
        apify_analysis: {
          total_sent_by_apify: 2089, // Selon l'utilisateur
          received_in_raw_table: rawPostsReceived || 0,
          difference: 2089 - (rawPostsReceived || 0),
          possible_causes: [
            'Duplication lors de l\'insertion',
            'Erreurs réseau lors de la réception',
            'Filtrage côté webhook avant insertion',
            'Timeouts lors du traitement'
          ]
        },
        temporal_distribution: Object.values(temporalDistribution),
        filtering_analysis: {
          total_raw_posts: totalPosts,
          person_filter_passed: personTypePosts,
          non_repost_filter_passed: nonRepostPosts,
          after_deduplication: uniqueUrnSet.size,
          person_filter_rejection_rate: totalPosts > 0 ? ((totalPosts - personTypePosts) / totalPosts) * 100 : 0,
          repost_filter_rejection_rate: totalPosts > 0 ? (repostCounts.reposts / totalPosts) * 100 : 0,
          deduplication_rejection_rate: totalPosts > 0 ? (potentialDuplicates / totalPosts) * 100 : 0
        },
        detailed_author_types: detailedAuthorTypes,
        repost_analysis: {
          total_posts: totalPosts,
          reposts: repostCounts.reposts,
          non_reposts: repostCounts.non_reposts,
          repost_percentage: totalPosts > 0 ? (repostCounts.reposts / totalPosts) * 100 : 0
        },
        duplication_analysis: {
          unique_urns_raw: uniqueUrnSet.size,
          unique_urns_filtered: filteredPostsCount || 0,
          potential_duplicates: potentialDuplicates
        },
        webhook_execution_analysis: webhookStats?.map(stat => ({
          execution_time: new Date(stat.created_at).toLocaleTimeString('fr-FR'),
          dataset_id: stat.dataset_id?.substring(0, 12) + '...',
          total_received: stat.total_received,
          successfully_inserted: stat.successfully_inserted,
          processing_errors: stat.processing_errors
        })) || []
      });

    } catch (err: any) {
      console.error('Erreur lors de l\'analyse approfondie:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDeepAnalysis();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Analyse approfondie en cours...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Erreur lors de l'analyse : {error}</p>
          <Button onClick={runDeepAnalysis} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Analyse approfondie des données (1er juin 2025)</h3>
        <Button onClick={runDeepAnalysis} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Analyse Apify vs Données reçues */}
      <Card className="border-yellow-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            🔍 Analyse Apify vs Données reçues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{data.apify_analysis.total_sent_by_apify}</div>
              <div className="text-sm text-gray-600">Envoyés par Apify</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{data.apify_analysis.received_in_raw_table}</div>
              <div className="text-sm text-gray-600">Reçus en base</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">-{data.apify_analysis.difference}</div>
              <div className="text-sm text-gray-600">Différence</div>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-medium mb-2">Causes possibles de la différence :</h4>
            <ul className="space-y-1">
              {data.apify_analysis.possible_causes.map((cause, index) => (
                <li key={index} className="text-sm text-gray-600">• {cause}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Distribution temporelle */}
      <Card>
        <CardHeader>
          <CardTitle>⏰ Distribution temporelle des réceptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.temporal_distribution.map((dist, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <span className="font-medium">{dist.hour}</span>
                <Badge variant="outline">{dist.raw_posts_received} posts reçus</Badge>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              💡 <strong>Explication de l'étalement :</strong> Les données peuvent être étalées dans le temps à cause du traitement asynchrone, 
              des retries automatiques, ou de multiples exécutions du webhook.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Analyse des filtres */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            🚫 Analyse des filtres (Pourquoi 0 posts passent ?)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{data.filtering_analysis.total_raw_posts}</div>
              <div className="text-sm text-gray-600">Posts bruts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{data.filtering_analysis.person_filter_passed}</div>
              <div className="text-sm text-gray-600">Filtre "Person"</div>
              <Badge variant="outline" className="mt-1">
                {data.filtering_analysis.person_filter_rejection_rate.toFixed(1)}% rejetés
              </Badge>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{data.filtering_analysis.non_repost_filter_passed}</div>
              <div className="text-sm text-gray-600">Non-reposts</div>
              <Badge variant="outline" className="mt-1">
                {data.filtering_analysis.repost_filter_rejection_rate.toFixed(1)}% reposts
              </Badge>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{data.filtering_analysis.after_deduplication}</div>
              <div className="text-sm text-gray-600">Après déduplication</div>
              <Badge variant="outline" className="mt-1">
                {data.filtering_analysis.deduplication_rejection_rate.toFixed(1)}% doublons
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Types d'auteurs détaillés */}
      <Card>
        <CardHeader>
          <CardTitle>👥 Répartition des types d'auteurs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.detailed_author_types.map((type, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <span className="font-medium">{type.author_type}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{type.count} posts</Badge>
                  <Badge variant={type.author_type === 'Person' ? 'default' : 'secondary'}>
                    {type.percentage.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Analyse des reposts */}
      <Card>
        <CardHeader>
          <CardTitle>🔁 Analyse des reposts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{data.repost_analysis.total_posts}</div>
              <div className="text-sm text-gray-600">Total posts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{data.repost_analysis.reposts}</div>
              <div className="text-sm text-gray-600">Reposts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{data.repost_analysis.non_reposts}</div>
              <div className="text-sm text-gray-600">Posts originaux</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-center">
              <Badge variant={data.repost_analysis.repost_percentage > 50 ? 'destructive' : 'default'}>
                {data.repost_analysis.repost_percentage.toFixed(1)}% de reposts
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exécutions des webhooks */}
      {data.webhook_execution_analysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🔗 Exécutions des webhooks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.webhook_execution_analysis.map((execution, index) => (
                <div key={index} className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{execution.execution_time}</span>
                    <Badge variant="outline">{execution.dataset_id}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span>Reçus: {execution.total_received}</span>
                    <span>Insérés: {execution.successfully_inserted}</span>
                    <span>Erreurs: {execution.processing_errors}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conclusion et recommandations */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">🎯 Conclusions et recommandations</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800">
          <div className="space-y-3">
            <div>
              <h4 className="font-medium">Problème principal identifié :</h4>
              <p className="text-sm">Le filtrage est trop strict ou il y a un problème dans la logique de filtrage combinée.</p>
            </div>
            <div>
              <h4 className="font-medium">Actions recommandées :</h4>
              <ul className="text-sm space-y-1">
                <li>• Vérifier la logique de filtrage dans le webhook</li>
                <li>• Analyser les logs des webhooks pour identifier les erreurs</li>
                <li>• Revoir les critères de filtrage Person + non-repost</li>
                <li>• Tester avec un échantillon réduit pour valider le processus</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

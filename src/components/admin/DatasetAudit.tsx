import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { AlertTriangle, CheckCircle, XCircle, Clock, Database, Users, TrendingUp } from 'lucide-react';

interface DatasetStats {
  dataset_id: string;
  total_received: number;
  stored_raw: number;
  queued_for_processing?: number;
  processing_errors: number;
  started_at: string;
  completed_at?: string;
}

interface ProcessingStats {
  total_posts: number;
  completed: number;
  failed: number;
  processing: number;
  not_job_posting: number;
  filtered_out: number;
  duplicate: number;
  step1_passed: number;
  step2_passed: number;
  step3_passed: number;
  leads_created: number;
  client_leads: number;
}

interface DatasetAuditData {
  webhookStats: DatasetStats | null;
  processingStats: ProcessingStats;
  timelineData: any[];
  errorDetails: any[];
  recommendations: string[];
}

export function DatasetAudit() {
  const [auditData, setAuditData] = useState<DatasetAuditData | null>(null);
  const [loading, setLoading] = useState(false);
  const [targetDate, setTargetDate] = useState('2025-06-02');
  const [targetTime, setTargetTime] = useState('12:18');
  const [datasetId, setDatasetId] = useState('');

  const runAudit = async () => {
    setLoading(true);
    try {
      console.log(`🔍 Démarrage audit pour ${targetDate} ${targetTime}`);
      
      // 1. Rechercher le dataset du webhook Apify vers l'heure ciblée
      const targetDateTime = new Date(`${targetDate}T${targetTime}:00.000Z`);
      const startRange = new Date(targetDateTime.getTime() - 30 * 60000); // -30 min
      const endRange = new Date(targetDateTime.getTime() + 30 * 60000); // +30 min

      const { data: webhookStats } = await supabase
        .from('apify_webhook_stats')
        .select('*')
        .gte('started_at', startRange.toISOString())
        .lte('started_at', endRange.toISOString())
        .order('total_received', { ascending: false })
        .limit(1);

      const foundDataset = webhookStats?.[0];
      if (!foundDataset) {
        throw new Error(`Aucun dataset trouvé vers ${targetDate} ${targetTime}`);
      }

      console.log(`📊 Dataset trouvé: ${foundDataset.dataset_id} avec ${foundDataset.total_received} records`);
      setDatasetId(foundDataset.dataset_id);

      // Create compatible DatasetStats object
      const datasetStats: DatasetStats = {
        dataset_id: foundDataset.dataset_id,
        total_received: foundDataset.total_received,
        stored_raw: foundDataset.stored_raw || foundDataset.total_received,
        queued_for_processing: foundDataset.after_required_fields_filter || 0,
        processing_errors: foundDataset.processing_errors || 0,
        started_at: foundDataset.started_at,
        completed_at: foundDataset.completed_at
      };

      // 2. Analyser les posts LinkedIn de ce dataset
      const { data: posts } = await supabase
        .from('linkedin_posts')
        .select('*')
        .eq('apify_dataset_id', foundDataset.dataset_id);

      const { data: rawPosts } = await supabase
        .from('linkedin_posts_raw')
        .select('*')
        .eq('apify_dataset_id', foundDataset.dataset_id);

      // 3. Analyser les leads créés
      const { data: leads } = await supabase
        .from('leads')
        .select('*, linkedin_posts!inner(*)')
        .eq('linkedin_posts.apify_dataset_id', foundDataset.dataset_id);

      // 4. Calculer les statistiques de processing
      const processingStats: ProcessingStats = {
        total_posts: posts?.length || 0,
        completed: posts?.filter(p => p.processing_status === 'completed').length || 0,
        failed: posts?.filter(p => p.processing_status?.includes('error') || p.processing_status?.includes('failed')).length || 0,
        processing: posts?.filter(p => p.processing_status === 'processing').length || 0,
        not_job_posting: posts?.filter(p => p.processing_status === 'not_job_posting').length || 0,
        filtered_out: posts?.filter(p => p.processing_status === 'filtered_out').length || 0,
        duplicate: posts?.filter(p => p.processing_status === 'duplicate').length || 0,
        step1_passed: posts?.filter(p => p.openai_step1_recrute_poste === 'oui').length || 0,
        step2_passed: posts?.filter(p => p.openai_step2_reponse === 'oui').length || 0,
        step3_passed: posts?.filter(p => p.openai_step3_categorie && p.openai_step3_categorie !== 'Autre').length || 0,
        leads_created: leads?.length || 0,
        client_leads: leads?.filter(l => l.is_client_lead).length || 0
      };

      // 5. Analyser la timeline de traitement
      const timelineData = posts?.map(post => ({
        id: post.id,
        created_at: post.created_at,
        last_updated_at: post.last_updated_at,
        processing_status: post.processing_status,
        retry_count: post.retry_count || 0,
        processing_time: post.last_updated_at && post.created_at 
          ? Math.round((new Date(post.last_updated_at).getTime() - new Date(post.created_at).getTime()) / 60000)
          : null
      })) || [];

      // 6. Identifier les erreurs
      const errorDetails = posts?.filter(p => 
        p.processing_status?.includes('error') || 
        p.processing_status?.includes('failed') ||
        (p.retry_count && p.retry_count > 0)
      ).map(post => ({
        id: post.id,
        status: post.processing_status,
        retry_count: post.retry_count,
        last_retry: post.last_retry_at,
        author_name: post.author_name,
        error_details: post.approach_message_error
      })) || [];

      // 7. Générer des recommandations
      const recommendations = generateRecommendations(datasetStats, processingStats, rawPosts?.length || 0);

      setAuditData({
        webhookStats: datasetStats,
        processingStats,
        timelineData,
        errorDetails,
        recommendations
      });

    } catch (error) {
      console.error('❌ Erreur audit:', error);
      alert(`Erreur lors de l'audit: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = (webhook: DatasetStats, processing: ProcessingStats, rawCount: number): string[] => {
    const recommendations = [];
    
    // Analyse de la réception
    if (webhook.total_received !== rawCount) {
      recommendations.push(`⚠️ PERTE DE DONNÉES: ${webhook.total_received} reçus vs ${rawCount} stockés brut (${webhook.total_received - rawCount} perdus)`);
    }
    
    // Analyse du processing
    const processingRate = (webhook.queued_for_processing || 0) / webhook.total_received;
    if (processingRate < 0.7) {
      recommendations.push(`📉 FAIBLE TAUX DE PROCESSING: Seulement ${(processingRate * 100).toFixed(1)}% des posts traités (${webhook.queued_for_processing}/${webhook.total_received})`);
    }
    
    // Analyse des erreurs
    if (processing.failed > 0) {
      recommendations.push(`❌ ÉCHECS DE TRAITEMENT: ${processing.failed} posts ont échoué - vérifier les logs des edge functions`);
    }
    
    // Analyse des étapes
    const step1Rate = processing.step1_passed / processing.total_posts;
    const step2Rate = processing.step2_passed / processing.step1_passed;
    const step3Rate = processing.step3_passed / processing.step2_passed;
    
    if (step1Rate < 0.1) {
      recommendations.push(`🎯 FAIBLE DÉTECTION JOB POSTINGS: ${(step1Rate * 100).toFixed(1)}% - revoir les prompts OpenAI Step 1`);
    }
    
    if (step2Rate < 0.8 && processing.step1_passed > 0) {
      recommendations.push(`🌍 FILTRE GÉOGRAPHIQUE STRICT: ${(step2Rate * 100).toFixed(1)}% de rétention - considérer élargir les critères`);
    }
    
    // Analyse de la conversion en leads
    const leadConversionRate = processing.leads_created / processing.completed;
    if (leadConversionRate < 0.5 && processing.completed > 0) {
      recommendations.push(`👤 FAIBLE CRÉATION DE LEADS: ${(leadConversionRate * 100).toFixed(1)}% des posts complétés créent des leads`);
    }
    
    // Performance temps
    if (webhook.processing_errors > webhook.total_received * 0.05) {
      recommendations.push(`⏱️ ERREURS DE PERFORMANCE: ${webhook.processing_errors} erreurs de processing - vérifier la capacité des workers`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ Aucun problème majeur détecté - le traitement semble normal');
    }
    
    return recommendations;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'not_job_posting': return 'bg-gray-100 text-gray-800';
      case 'filtered_out': return 'bg-yellow-100 text-yellow-800';
      case 'duplicate': return 'bg-purple-100 text-purple-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Audit Dataset LinkedIn Posts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Date:</label>
              <Input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Heure:</label>
              <Input
                type="time"
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
                className="w-32"
              />
            </div>
            <Button onClick={runAudit} disabled={loading}>
              {loading ? 'Analyse...' : 'Lancer l\'audit'}
            </Button>
          </div>
          
          {datasetId && (
            <div className="text-sm text-muted-foreground">
              Dataset analysé: <code className="bg-gray-100 px-2 py-1 rounded">{datasetId}</code>
            </div>
          )}
        </CardContent>
      </Card>

      {auditData && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="processing">Détail Processing</TabsTrigger>
            <TabsTrigger value="errors">Erreurs</TabsTrigger>
            <TabsTrigger value="recommendations">Recommandations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Réception Webhook
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Reçus:</span>
                      <Badge variant="secondary">{auditData.webhookStats?.total_received}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Stockés brut:</span>
                      <Badge variant="secondary">{auditData.webhookStats?.stored_raw}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">En queue:</span>
                      <Badge variant="secondary">{auditData.webhookStats?.queued_for_processing}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Traitement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Complétés:</span>
                      <Badge className="bg-green-100 text-green-800">{auditData.processingStats.completed}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Échecs:</span>
                      <Badge className="bg-red-100 text-red-800">{auditData.processingStats.failed}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">En cours:</span>
                      <Badge className="bg-blue-100 text-blue-800">{auditData.processingStats.processing}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Leads Créés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Total leads:</span>
                      <Badge variant="secondary">{auditData.processingStats.leads_created}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Leads clients:</span>
                      <Badge className="bg-blue-100 text-blue-800">{auditData.processingStats.client_leads}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Taux conversion:</span>
                      <Badge variant="outline">
                        {auditData.processingStats.completed > 0 
                          ? `${((auditData.processingStats.leads_created / auditData.processingStats.completed) * 100).toFixed(1)}%`
                          : '0%'
                        }
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Répartition par statut</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{auditData.processingStats.completed}</div>
                    <div className="text-sm text-muted-foreground">Complétés</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">{auditData.processingStats.not_job_posting}</div>
                    <div className="text-sm text-muted-foreground">Pas job posting</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{auditData.processingStats.filtered_out}</div>
                    <div className="text-sm text-muted-foreground">Filtrés</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{auditData.processingStats.failed}</div>
                    <div className="text-sm text-muted-foreground">Échecs</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="processing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Analyse des étapes OpenAI</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">Étape 1 - Détection job posting</div>
                      <div className="text-sm text-muted-foreground">
                        {auditData.processingStats.step1_passed} / {auditData.processingStats.total_posts} posts identifiés comme job postings
                      </div>
                    </div>
                    <Badge variant="outline">
                      {auditData.processingStats.total_posts > 0 
                        ? `${((auditData.processingStats.step1_passed / auditData.processingStats.total_posts) * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">Étape 2 - Filtre langue/localisation</div>
                      <div className="text-sm text-muted-foreground">
                        {auditData.processingStats.step2_passed} / {auditData.processingStats.step1_passed} posts validés
                      </div>
                    </div>
                    <Badge variant="outline">
                      {auditData.processingStats.step1_passed > 0 
                        ? `${((auditData.processingStats.step2_passed / auditData.processingStats.step1_passed) * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">Étape 3 - Catégorisation</div>
                      <div className="text-sm text-muted-foreground">
                        {auditData.processingStats.step3_passed} / {auditData.processingStats.step2_passed} posts catégorisés
                      </div>
                    </div>
                    <Badge variant="outline">
                      {auditData.processingStats.step2_passed > 0 
                        ? `${((auditData.processingStats.step3_passed / auditData.processingStats.step2_passed) * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="errors" className="space-y-4">
            {auditData.errorDetails.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    Détail des erreurs ({auditData.errorDetails.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {auditData.errorDetails.map((error, index) => (
                      <div key={index} className="p-3 border rounded-lg bg-red-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{error.author_name || 'Auteur inconnu'}</div>
                            <Badge className={getStatusColor(error.status)}>
                              {error.status}
                            </Badge>
                            {error.retry_count > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {error.retry_count} tentatives - dernière: {error.last_retry ? new Date(error.last_retry).toLocaleString() : 'N/A'}
                              </div>
                            )}
                            {error.error_details && (
                              <div className="text-xs text-red-600 mt-1 font-mono">
                                {error.error_details}
                              </div>
                            )}
                          </div>
                          <code className="text-xs bg-white px-2 py-1 rounded">
                            {error.id.substring(0, 8)}
                          </code>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">Aucune erreur détectée</p>
                  <p className="text-muted-foreground">Tous les posts ont été traités sans erreur</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Plan de correction et recommandations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {auditData.recommendations.map((rec, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="text-sm">{rec}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actions recommandées</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-medium">1.</span>
                    <span>Vérifier les logs des edge functions <code>process-linkedin-post</code> et <code>apify-webhook</code></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium">2.</span>
                    <span>Analyser les prompts OpenAI si les taux de conversion sont faibles</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium">3.</span>
                    <span>Relancer le traitement des posts en échec via la fonction de requalification</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium">4.</span>
                    <span>Vérifier la capacité des comptes Unipile si beaucoup d'erreurs de scraping</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

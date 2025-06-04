import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, Database, CheckCircle, XCircle, Search, Play, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface ReprocessingResult {
  success: boolean;
  action: string;
  dataset_id: string;
  statistics: {
    total_fetched?: number;
    stored_raw?: number;
    queued_for_processing?: number;
    started_at: string;
    completed_at?: string;
    apify_item_count?: number;
    apify_clean_item_count?: number;
    resumed_from_batch?: number;
    bypass_metadata_check?: boolean;
    metadata_corrected?: boolean;
    delegation_successful?: boolean;
    optimization_applied?: string;
  };
  diagnostics?: {
    retrieval_rate_percent?: string;
    qualification_rate_percent?: string;
    excluded_breakdown?: {
      companies?: number;
      missing_fields?: number;
      already_processed?: number;
    };
    metadata_bypass_used?: boolean;
    metadata_corrected?: boolean;
    expected_items?: string | number;
    cleaned_records?: number;
  };
  improvements?: string[];
  queue_response?: {
    success: boolean;
    message: string;
    dataset_id: string;
  };
  optimization?: {
    strategy: string;
    reason: string;
    delegation_time_ms: number;
  };
  message?: string;
}

export function DatasetReprocessing() {
  const [datasetId, setDatasetId] = useState('');
  const [cleanupExisting, setCleanupExisting] = useState(false);
  const [forceAll, setForceAll] = useState(false);
  const [bypassMetadataCheck, setBypassMetadataCheck] = useState(false);
  const [resumeFromBatch, setResumeFromBatch] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ReprocessingResult | null>(null);

  const startReprocessing = async (isResume = false) => {
    if (!datasetId.trim()) {
      toast.error('Veuillez saisir un Dataset ID');
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      console.log('🔄 Starting enhanced dataset processing with bypass:', bypassMetadataCheck);
      
      const { data, error } = await supabase.functions.invoke('process-dataset', {
        body: {
          datasetId: datasetId.trim(),
          cleanupExisting: isResume ? false : cleanupExisting,
          forceAll,
          resumeFromBatch: isResume ? resumeFromBatch : 0,
          bypassMetadataCheck
        }
      });

      if (error) {
        console.error('❌ Reprocessing error:', error);
        toast.error(`Erreur lors du retraitement: ${error.message}`);
        return;
      }

      console.log('✅ Reprocessing completed:', data);
      setResult(data);
      
      if (data.success) {
        const retrievalRate = data.diagnostics?.retrieval_rate_percent ? parseFloat(data.diagnostics.retrieval_rate_percent) : 0;
        
        if (data.diagnostics?.metadata_bypass_used) {
          toast.success(`✅ Dataset retraité avec bypass metadata! Délégué au gestionnaire de queue`);
        } else if (data.diagnostics?.metadata_corrected) {
          toast.warning(`⚠️ Métadonnées Apify corrigées! Dataset retraité: ${data.statistics.queued_for_processing || 0} posts`);
        } else if (data.optimization?.strategy === 'immediate_delegation') {
          toast.success(`🚀 Dataset délégué avec succès au gestionnaire spécialisé! Traitement en arrière-plan.`);
        } else if (retrievalRate < 80 && retrievalRate > 0) {
          toast.warning(`⚠️ Dataset retraité avec alertes! Taux de récupération: ${retrievalRate}%`);
        } else {
          toast.success(`✅ Dataset retraité avec succès! ${data.statistics.queued_for_processing || 0} posts en queue`);
        }
      } else {
        toast.error('❌ Le retraitement a échoué');
      }

    } catch (error) {
      console.error('❌ Unexpected error:', error);
      toast.error('Erreur inattendue lors du retraitement');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Retraitement robuste de Dataset
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Dataset ID Apify:</label>
              <Input
                value={datasetId}
                onChange={(e) => setDatasetId(e.target.value)}
                placeholder="ex: c0YR6bSA4NdzBGQrB"
                className="mt-1"
              />
            </div>

            <div className="space-y-4 border p-4 rounded-lg bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700">Options de traitement</h3>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="cleanup"
                  checked={cleanupExisting}
                  onCheckedChange={setCleanupExisting}
                />
                <label htmlFor="cleanup" className="text-sm font-medium">
                  Nettoyer les données existantes
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="forceAll"
                  checked={forceAll}
                  onCheckedChange={setForceAll}
                />
                <label htmlFor="forceAll" className="text-sm font-medium">
                  Mode forceAll (récupérer tous les items)
                </label>
              </div>

              <div className="flex items-center space-x-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <Switch
                  id="bypassMetadata"
                  checked={bypassMetadataCheck}
                  onCheckedChange={setBypassMetadataCheck}
                />
                <div className="flex-1">
                  <label htmlFor="bypassMetadata" className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-orange-600" />
                    Mode Bypass Métadonnées
                  </label>
                  <p className="text-xs text-orange-700 mt-1">
                    Ignorer les vérifications de métadonnées Apify (recommandé pour c0YR6bSA4NdzBGQrB)
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Reprendre depuis le batch:</label>
                  <Input
                    type="number"
                    value={resumeFromBatch}
                    onChange={(e) => setResumeFromBatch(Number(e.target.value))}
                    placeholder="0"
                    className="mt-1"
                    min="0"
                  />
                </div>
                <Button
                  onClick={() => startReprocessing(true)}
                  disabled={isProcessing || !datasetId.trim() || resumeFromBatch <= 0}
                  variant="outline"
                  className="mt-6"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Reprendre
                </Button>
              </div>
            </div>
          </div>

          {/* Messages d'alerte conditionnels */}
          {cleanupExisting && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <div className="font-medium">Attention: Suppression des données</div>
                <div>Cette option supprimera tous les posts existants de ce dataset avant le retraitement.</div>
              </div>
            </div>
          )}

          {forceAll && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Search className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <div className="font-medium">Mode diagnostic avancé</div>
                <div>Récupère TOUS les items Apify (même vides) pour diagnostiquer les pertes de données.</div>
              </div>
            </div>
          )}

          {bypassMetadataCheck && (
            <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Shield className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-sm text-green-800">
                <div className="font-medium">✅ Mode bypass métadonnées activé</div>
                <div>Le système ignorera complètement les vérifications de métadonnées Apify et procédera directement au traitement. Parfait pour contourner le bug des métadonnées incorrectes.</div>
              </div>
            </div>
          )}

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="font-medium">Ce processus va :</div>
            <ul className="list-disc list-inside space-y-1 ml-2">
              {bypassMetadataCheck ? (
                <>
                  <li>🚨 <strong>BYPASS:</strong> Ignorer complètement les métadonnées Apify</li>
                  <li>🚀 Procéder directement à la récupération des données</li>
                </>
              ) : (
                <>
                  <li>🔍 Vérifier les métadonnées Apify avec correction automatique</li>
                  <li>🛡️ Détecter et contourner les métadonnées incorrectes</li>
                  <li>📊 Effectuer une vérification directe si métadonnées suspectes</li>
                </>
              )}
              <li>📥 Récupérer les données avec diagnostic de perte</li>
              <li>💾 Utiliser des upserts pour éviter les conflits de duplicatas</li>
              <li>🎯 Appliquer la classification simplifiée</li>
              <li>📊 Fournir un rapport détaillé avec taux de récupération</li>
              <li>🚀 Déléguer au gestionnaire de queue spécialisé</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={() => startReprocessing(false)}
              disabled={isProcessing || !datasetId.trim()}
              className="flex-1"
              variant={bypassMetadataCheck ? "default" : "default"}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Retraitement en cours...
                </>
              ) : (
                <>
                  {bypassMetadataCheck ? (
                    <Shield className="h-4 w-4 mr-2" />
                  ) : (
                    <Database className="h-4 w-4 mr-2" />
                  )}
                  {bypassMetadataCheck ? 'Lancer avec bypass métadonnées' : 'Lancer le retraitement robuste'}
                </>
              )}
            </Button>
          </div>

          {/* Suggestion pour le dataset spécifique */}
          {datasetId === 'c0YR6bSA4NdzBGQrB' && !bypassMetadataCheck && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <div className="font-medium">💡 Suggestion pour ce dataset</div>
                <div>Les logs montrent que ce dataset a des métadonnées incorrectes. Nous recommandons d'activer le <strong>Mode Bypass Métadonnées</strong> ci-dessus.</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Résultat du retraitement robuste
              {result.statistics.resumed_from_batch && (
                <Badge variant="outline">Repris du batch {result.statistics.resumed_from_batch}</Badge>
              )}
              {result.diagnostics?.metadata_bypass_used && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  <Shield className="h-3 w-3 mr-1" />
                  Bypass métadonnées
                </Badge>
              )}
              {result.diagnostics?.metadata_corrected && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Métadonnées corrigées
                </Badge>
              )}
              {result.optimization?.strategy === 'immediate_delegation' && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  Délégation optimisée
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Affichage adapté selon le type de réponse */}
            {result.optimization?.strategy === 'immediate_delegation' ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="font-medium text-blue-800">🚀 Traitement délégué avec succès</div>
                  <div className="text-sm text-blue-700 mt-2">
                    Le dataset a été délégué au gestionnaire de queue spécialisé en {result.optimization.delegation_time_ms}ms. 
                    Le traitement continue en arrière-plan.
                  </div>
                  {result.queue_response && (
                    <div className="text-xs text-blue-600 mt-2">
                      Queue: {result.queue_response.message}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">
                      Délégué
                    </div>
                    <div className="text-sm text-muted-foreground">Statut</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {result.diagnostics?.expected_items || 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">Items attendus</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {result.diagnostics?.cleaned_records || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Nettoyés</div>
                  </div>
                </div>
              </div>
            ) : (
              // Affichage classique pour les réponses complètes
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {result.statistics.total_fetched || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Récupérés</div>
                  <div className="text-xs text-gray-500">
                    / {result.statistics.apify_item_count || '?'} attendus
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {result.statistics.stored_raw || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Stockés brut</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {result.statistics.queued_for_processing || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">En queue</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    result.diagnostics?.retrieval_rate_percent === 'metadata_unreliable'
                      ? 'text-orange-600'
                      : result.diagnostics && parseFloat(result.diagnostics.retrieval_rate_percent || '0') >= 80 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {result.diagnostics?.retrieval_rate_percent === 'metadata_unreliable' 
                      ? 'N/A' 
                      : `${result.diagnostics?.retrieval_rate_percent || '0'}%`}
                  </div>
                  <div className="text-sm text-muted-foreground">Taux récupération</div>
                </div>
              </div>
            )}

            {result.diagnostics && (
              <div className="space-y-3">
                <div className="font-medium">Diagnostic détaillé:</div>
                <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                  {result.diagnostics.qualification_rate_percent && (
                    <div className="flex justify-between">
                      <span>Taux de qualification:</span>
                      <Badge variant="outline">{result.diagnostics.qualification_rate_percent}%</Badge>
                    </div>
                  )}
                  
                  {result.diagnostics.metadata_bypass_used && (
                    <div className="flex items-center gap-2 text-orange-700">
                      <Shield className="h-3 w-3" />
                      <span className="text-xs font-medium">Bypass métadonnées activé</span>
                    </div>
                  )}
                  
                  {result.diagnostics.metadata_corrected && (
                    <div className="flex items-center gap-2 text-blue-700">
                      <CheckCircle className="h-3 w-3" />
                      <span className="text-xs font-medium">Métadonnées Apify corrigées automatiquement</span>
                    </div>
                  )}
                  
                  {result.diagnostics.excluded_breakdown && (
                    <div className="space-y-1">
                      <div className="font-medium text-xs text-gray-600">Exclusions:</div>
                      <div className="flex justify-between text-xs">
                        <span>🏢 Entreprises:</span>
                        <span>{result.diagnostics.excluded_breakdown.companies || 0}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>❌ Champs manquants:</span>
                        <span>{result.diagnostics.excluded_breakdown.missing_fields || 0}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>🔄 Déjà traités:</span>
                        <span>{result.diagnostics.excluded_breakdown.already_processed || 0}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {result.improvements && result.improvements.length > 0 && (
              <div className="space-y-2">
                <div className="font-medium">Améliorations appliquées:</div>
                <div className="space-y-1">
                  {result.improvements.map((improvement, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="text-sm">{improvement}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.message && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-800">{result.message}</div>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Dataset: <code className="bg-gray-100 px-2 py-1 rounded">{result.dataset_id}</code> | 
              Démarré: {new Date(result.statistics.started_at).toLocaleString()}
              {result.statistics.completed_at && (
                <> | Terminé: {new Date(result.statistics.completed_at).toLocaleString()}</>
              )}
              {result.statistics.resumed_from_batch && (
                <> | Repris du batch: {result.statistics.resumed_from_batch}</>
              )}
              {result.statistics.bypass_metadata_check && (
                <> | Mode bypass: activé</>
              )}
              {result.optimization && (
                <> | Optimisation: {result.optimization.strategy}</>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

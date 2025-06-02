
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, Database, CheckCircle, XCircle, Search } from 'lucide-react';
import { toast } from 'sonner';

interface ReprocessingResult {
  success: boolean;
  action: string;
  dataset_id: string;
  statistics: {
    total_fetched: number;
    stored_raw: number;
    queued_for_processing: number;
    started_at: string;
    completed_at: string;
    apify_item_count: number;
    apify_clean_item_count: number;
  };
  diagnostics: {
    retrieval_rate_percent: string;
    qualification_rate_percent: string;
    excluded_breakdown: {
      companies: number;
      missing_fields: number;
      already_processed: number;
    };
  };
  improvements: string[];
}

export function DatasetReprocessing() {
  const [datasetId, setDatasetId] = useState('');
  const [cleanupExisting, setCleanupExisting] = useState(false);
  const [forceAll, setForceAll] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ReprocessingResult | null>(null);

  const startReprocessing = async () => {
    if (!datasetId.trim()) {
      toast.error('Veuillez saisir un Dataset ID');
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      console.log('🔄 Starting enhanced dataset processing...');
      
      const { data, error } = await supabase.functions.invoke('process-dataset', {
        body: {
          datasetId: datasetId.trim(),
          cleanupExisting,
          forceAll
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
        const retrievalRate = parseFloat(data.diagnostics?.retrieval_rate_percent || '0');
        if (retrievalRate < 80) {
          toast.warning(`Dataset retraité avec alertes! Taux de récupération: ${retrievalRate}%`);
        } else {
          toast.success(`Dataset retraité avec succès! ${data.statistics.queued_for_processing} posts en queue`);
        }
      } else {
        toast.error('Le retraitement a échoué');
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
            Retraitement avancé de Dataset
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Dataset ID Apify:</label>
              <Input
                value={datasetId}
                onChange={(e) => setDatasetId(e.target.value)}
                placeholder="ex: fLb3igSu5dgsM3de8"
                className="mt-1"
              />
            </div>

            <div className="space-y-3">
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
            </div>
          </div>

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

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="font-medium">Ce processus va :</div>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>🔍 Vérifier les métadonnées Apify (itemCount vs cleanItemCount)</li>
              <li>📥 Récupérer les données avec diagnostic de perte</li>
              <li>💾 Utiliser des upserts pour éviter les conflits de duplicatas</li>
              <li>🎯 Appliquer la classification simplifiée (exclusion Company uniquement)</li>
              <li>📊 Fournir un rapport détaillé avec taux de récupération</li>
              <li>🚨 Alerter en cas de perte significative d'items (&lt; 80%)</li>
            </ul>
          </div>

          <Button 
            onClick={startReprocessing}
            disabled={isProcessing || !datasetId.trim()}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Retraitement en cours...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Lancer le retraitement avancé
              </>
            )}
          </Button>
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
              Résultat du retraitement avancé
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {result.statistics.total_fetched}
                </div>
                <div className="text-sm text-muted-foreground">Récupérés</div>
                <div className="text-xs text-gray-500">
                  / {result.statistics.apify_item_count} attendus
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {result.statistics.stored_raw}
                </div>
                <div className="text-sm text-muted-foreground">Stockés brut</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {result.statistics.queued_for_processing}
                </div>
                <div className="text-sm text-muted-foreground">En queue</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  result.diagnostics && parseFloat(result.diagnostics.retrieval_rate_percent) >= 80 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {result.diagnostics?.retrieval_rate_percent || '0'}%
                </div>
                <div className="text-sm text-muted-foreground">Taux récupération</div>
              </div>
            </div>

            {result.diagnostics && (
              <div className="space-y-3">
                <div className="font-medium">Diagnostic détaillé:</div>
                <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Taux de qualification:</span>
                    <Badge variant="outline">{result.diagnostics.qualification_rate_percent}%</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium text-xs text-gray-600">Exclusions:</div>
                    <div className="flex justify-between text-xs">
                      <span>🏢 Entreprises:</span>
                      <span>{result.diagnostics.excluded_breakdown.companies}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>❌ Champs manquants:</span>
                      <span>{result.diagnostics.excluded_breakdown.missing_fields}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>🔄 Déjà traités:</span>
                      <span>{result.diagnostics.excluded_breakdown.already_processed}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

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

            <div className="text-xs text-muted-foreground">
              Dataset: <code className="bg-gray-100 px-2 py-1 rounded">{result.dataset_id}</code> | 
              Démarré: {new Date(result.statistics.started_at).toLocaleString()} | 
              Terminé: {new Date(result.statistics.completed_at).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

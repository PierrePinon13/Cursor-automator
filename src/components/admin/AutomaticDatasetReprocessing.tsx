
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export function AutomaticDatasetReprocessing() {
  const [isExecuting, setIsExecuting] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    executeReprocessing();
  }, []);

  const executeReprocessing = async () => {
    setIsExecuting(true);
    setError(null);
    
    try {
      console.log('🚀 Starting automatic reprocessing of dataset 6evrf10c9cmQqX7TP');
      
      const { data, error } = await supabase.functions.invoke('execute-dataset-reprocessing', {
        body: {}
      });

      if (error) {
        console.error('❌ Reprocessing error:', error);
        setError(error.message);
        return;
      }

      console.log('✅ Reprocessing completed:', data);
      setResult(data);
      
    } catch (error: any) {
      console.error('❌ Unexpected error:', error);
      setError(error.message || 'Erreur inattendue');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isExecuting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : result?.success ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
          Retraitement automatique du dataset 6evrf10c9cmQqX7TP
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isExecuting && (
          <div className="text-center py-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Exécution du retraitement en cours...
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Erreur lors du retraitement</span>
            </div>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <Button 
              onClick={executeReprocessing} 
              variant="outline" 
              size="sm"
              className="mt-3"
            >
              Réessayer
            </Button>
          </div>
        )}

        {result && result.success && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800 mb-2">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">Retraitement terminé avec succès</span>
              </div>
              <p className="text-sm text-green-700">{result.message}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {result.verification.raw_posts}
                </div>
                <div className="text-sm text-muted-foreground">Posts bruts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {result.verification.queued_posts}
                </div>
                <div className="text-sm text-muted-foreground">En queue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {result.verification.pending_posts}
                </div>
                <div className="text-sm text-muted-foreground">En attente</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {result.cleanup.deleted_posts + result.cleanup.deleted_raw}
                </div>
                <div className="text-sm text-muted-foreground">Nettoyés</div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Dataset: <code className="bg-gray-100 px-2 py-1 rounded">{result.dataset_id}</code>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

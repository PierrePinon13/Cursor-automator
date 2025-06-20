
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Clock, Play, AlertCircle } from 'lucide-react';
import { useDailyJobsTrigger } from '@/hooks/useDailyJobsTrigger';
import { Badge } from '@/components/ui/badge';

export function DailyJobsTrigger() {
  const { triggerDailyJobs, loading } = useDailyJobsTrigger();

  const handleTrigger = async () => {
    await triggerDailyJobs();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Récupération quotidienne des offres
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            Planifié: 12h00 (Paris)
          </Badge>
          <Badge variant="secondary">
            Webhook n8n configuré
          </Badge>
        </div>
        
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>Fonctionnement automatique:</strong>
              <p className="mt-1">
                Chaque jour à 12h (heure de Paris), le système récupère automatiquement 
                les nouvelles offres d'emploi des clients avec suivi activé.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <strong className="text-sm font-medium">URL de callback publique:</strong>
          <code className="block p-2 bg-gray-100 rounded text-xs break-all">
            https://csilkrfizphtbmevlkme.supabase.co/functions/v1/n8n-jobs-callback
          </code>
          <p className="text-xs text-gray-600">
            Cette URL doit être configurée dans n8n pour recevoir les données d'offres d'emploi.
          </p>
        </div>

        <Button 
          onClick={handleTrigger}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Déclenchement en cours...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Déclencher manuellement
            </div>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

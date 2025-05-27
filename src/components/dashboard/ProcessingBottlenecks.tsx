
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Zap, Database, MessageSquare, Brain } from 'lucide-react';
import { useProcessingBottlenecks } from '@/hooks/useProcessingBottlenecks';

const ProcessingBottlenecks = () => {
  const { bottlenecks, loading } = useProcessingBottlenecks();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!bottlenecks) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Aucune donnée de goulots d'étranglement disponible</p>
        </CardContent>
      </Card>
    );
  }

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'step1': return <Brain className="h-4 w-4" />;
      case 'step2': return <Brain className="h-4 w-4" />;
      case 'step3': return <Brain className="h-4 w-4" />;
      case 'unipile': return <Database className="h-4 w-4" />;
      case 'message': return <MessageSquare className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getUrgencyColor = (count: number, total: number) => {
    const percentage = (count / total) * 100;
    if (percentage > 30) return 'text-red-600 border-red-200';
    if (percentage > 15) return 'text-yellow-600 border-yellow-200';
    return 'text-blue-600 border-blue-200';
  };

  const stepData = [
    { key: 'step1_pending', label: 'Step 1: Détection', count: bottlenecks.step1_pending, description: 'Analyse recrutement' },
    { key: 'step2_pending', label: 'Step 2: Localisation', count: bottlenecks.step2_pending, description: 'Géolocalisation' },
    { key: 'step3_pending', label: 'Step 3: Catégorie', count: bottlenecks.step3_pending, description: 'Classification' },
    { key: 'unipile_pending', label: 'Unipile Scraping', count: bottlenecks.unipile_pending, description: 'Extraction profil' },
    { key: 'message_pending', label: 'Génération Message', count: bottlenecks.message_pending, description: 'Message approche' },
  ];

  const timeData = [
    { key: 'last_hour', label: 'Dernière heure', count: bottlenecks.last_hour, color: 'text-green-600' },
    { key: 'last_24h', label: 'Dernières 24h', count: bottlenecks.last_24h, color: 'text-yellow-600' },
    { key: 'older_than_24h', label: '+ de 24h', count: bottlenecks.older_than_24h, color: 'text-red-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Vue d'ensemble */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Goulots d'Étranglement - {bottlenecks.total_processing} posts en processing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {stepData.map((step) => (
              <Card key={step.key} className={`border ${getUrgencyColor(step.count, bottlenecks.total_processing)}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium">{step.label}</CardTitle>
                  {getStepIcon(step.key)}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{step.count}</div>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {bottlenecks.total_processing > 0 ? 
                      `${((step.count / bottlenecks.total_processing) * 100).toFixed(1)}%` : 
                      '0%'
                    }
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Analyse temporelle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Répartition par Ancienneté
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {timeData.map((time) => (
              <div key={time.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{time.label}</p>
                  <p className="text-xs text-muted-foreground">Posts en attente</p>
                </div>
                <Badge variant="outline" className={time.color}>
                  {time.count}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alertes */}
      {(bottlenecks.older_than_24h > 50 || bottlenecks.step1_pending > 100) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Alertes Système
            </CardTitle>
          </CardHeader>
          <CardContent className="text-orange-800">
            <ul className="space-y-1 text-sm">
              {bottlenecks.older_than_24h > 50 && (
                <li>• {bottlenecks.older_than_24h} posts bloqués depuis plus de 24h - Intervention requise</li>
              )}
              {bottlenecks.step1_pending > 100 && (
                <li>• Goulot d'étranglement majeur au Step 1 ({bottlenecks.step1_pending} posts) - Vérifier OpenAI</li>
              )}
              {bottlenecks.unipile_pending > 200 && (
                <li>• Surcharge Unipile détectée ({bottlenecks.unipile_pending} posts) - Vérifier l'API</li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProcessingBottlenecks;

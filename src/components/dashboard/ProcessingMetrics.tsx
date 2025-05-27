
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, Clock, Filter, Users } from 'lucide-react';
import { useProcessingMetrics } from '@/hooks/useProcessingMetrics';

interface ProcessingMetricsProps {
  timeFilter: string;
}

const ProcessingMetrics = ({ timeFilter }: ProcessingMetricsProps) => {
  const { metrics, conversionRates, loading } = useProcessingMetrics(timeFilter);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!metrics || !conversionRates) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Aucune donnée disponible pour la période sélectionnée</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Vue d'ensemble du pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Pipeline de Processing LinkedIn
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Étape 1: Détection recrutement */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Étape 1: Recrutement</span>
                <Badge variant="outline" className={getStatusColor(conversionRates.step1_rate)}>
                  {conversionRates.step1_rate.toFixed(1)}%
                </Badge>
              </div>
              <Progress 
                value={conversionRates.step1_rate} 
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">
                {metrics.step1_passed} / {metrics.total_posts} posts
              </div>
            </div>

            {/* Étape 2: Géolocalisation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Étape 2: Localisation</span>
                <Badge variant="outline" className={getStatusColor(conversionRates.step2_rate)}>
                  {conversionRates.step2_rate.toFixed(1)}%
                </Badge>
              </div>
              <Progress 
                value={conversionRates.step2_rate} 
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">
                {metrics.step2_passed} / {metrics.step1_passed} validés
              </div>
            </div>

            {/* Étape 3: Catégorisation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Étape 3: Catégorie</span>
                <Badge variant="outline" className={getStatusColor(conversionRates.step3_rate)}>
                  {conversionRates.step3_rate.toFixed(1)}%
                </Badge>
              </div>
              <Progress 
                value={conversionRates.step3_rate} 
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">
                {metrics.step3_passed} / {metrics.step2_passed} catégorisés
              </div>
            </div>

            {/* Finalisation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Complétés</span>
                <Badge variant="outline" className={getStatusColor(conversionRates.completion_rate)}>
                  {conversionRates.completion_rate.toFixed(1)}%
                </Badge>
              </div>
              <Progress 
                value={conversionRates.completion_rate} 
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">
                {metrics.completed} / {metrics.total_posts} finalisés
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Détail des statuts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Complétés</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.completed}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.total_posts > 0 ? ((metrics.completed / metrics.total_posts) * 100).toFixed(1) : 0}% du total
            </p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Traitement</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {metrics.processing + metrics.pending}
            </div>
            <p className="text-xs text-muted-foreground">
              Processing: {metrics.processing} • Pending: {metrics.pending}
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exclusions</CardTitle>
            <Filter className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metrics.not_job_posting + metrics.filtered_out}
            </div>
            <p className="text-xs text-muted-foreground">
              Pas recrutement: {metrics.not_job_posting} • Localisation: {metrics.filtered_out}
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Problèmes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics.duplicate + metrics.deduplication_error + metrics.error}
            </div>
            <p className="text-xs text-muted-foreground">
              Doublons: {metrics.duplicate} • Erreurs: {metrics.deduplication_error + metrics.error}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertes et recommandations */}
      {(conversionRates.step2_rate < 60 || conversionRates.completion_rate < 50) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Alertes de Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="text-orange-800">
            <ul className="space-y-1 text-sm">
              {conversionRates.step2_rate < 60 && (
                <li>• Taux de géolocalisation faible ({conversionRates.step2_rate.toFixed(1)}%) - Vérifier les critères de localisation</li>
              )}
              {conversionRates.completion_rate < 50 && (
                <li>• Taux de finalisation faible ({conversionRates.completion_rate.toFixed(1)}%) - Analyser les échecs de processing</li>
              )}
              {metrics.duplicate > metrics.completed * 0.2 && (
                <li>• Trop de doublons détectés ({metrics.duplicate}) - Optimiser la déduplication</li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProcessingMetrics;

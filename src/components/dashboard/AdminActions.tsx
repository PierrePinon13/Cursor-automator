
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  RotateCcw, 
  Trash2, 
  Search, 
  BarChart3, 
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useAdminActions } from '@/hooks/useAdminActions';
import { useProcessingBottlenecks } from '@/hooks/useProcessingBottlenecks';

const AdminActions = () => {
  const { executeAction, loading } = useAdminActions();
  const { bottlenecks, refetch } = useProcessingBottlenecks();

  const handleRetryErrorPosts = async () => {
    await executeAction({
      action_type: 'retry_posts',
      action_details: { status: 'error', maxRetries: 3 }
    });
    refetch();
  };

  const handleRetryStuckPosts = async () => {
    await executeAction({
      action_type: 'retry_posts',
      action_details: { 
        status: 'processing', 
        olderThan: '1 hour'
      }
    });
    refetch();
  };

  const handleDeleteFailedPosts = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement les posts échoués ?')) {
      return;
    }
    
    await executeAction({
      action_type: 'delete_posts',
      action_details: { status: 'failed_max_retries' }
    });
    refetch();
  };

  const handleCollectMetrics = async () => {
    await executeAction({
      action_type: 'collect_metrics',
      action_details: { manual: true }
    });
  };

  const getUrgencyLevel = () => {
    if (!bottlenecks) return 'normal';
    
    if (bottlenecks.older_than_24h > 50 || bottlenecks.step1_pending > 200) {
      return 'critical';
    }
    if (bottlenecks.last_24h > 100 || bottlenecks.total_processing > 500) {
      return 'warning';
    }
    return 'normal';
  };

  const urgencyLevel = getUrgencyLevel();

  return (
    <div className="space-y-6">
      {/* Statut système */}
      <Card className={`${
        urgencyLevel === 'critical' ? 'border-red-200 bg-red-50' :
        urgencyLevel === 'warning' ? 'border-yellow-200 bg-yellow-50' :
        'border-green-200 bg-green-50'
      }`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {urgencyLevel === 'critical' ? (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              ) : urgencyLevel === 'warning' ? (
                <Clock className="h-5 w-5 text-yellow-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              Statut du Système
            </span>
            <Badge variant={
              urgencyLevel === 'critical' ? 'destructive' :
              urgencyLevel === 'warning' ? 'secondary' : 'default'
            }>
              {urgencyLevel === 'critical' ? 'CRITIQUE' :
               urgencyLevel === 'warning' ? 'ATTENTION' : 'NORMAL'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium">Posts en traitement</p>
              <p className="text-lg">{bottlenecks?.total_processing || 0}</p>
            </div>
            <div>
              <p className="font-medium">Bloqués &gt; 24h</p>
              <p className={`text-lg ${(bottlenecks?.older_than_24h || 0) > 50 ? 'text-red-600' : ''}`}>
                {bottlenecks?.older_than_24h || 0}
              </p>
            </div>
            <div>
              <p className="font-medium">Goulot principal</p>
              <p className="text-lg">
                {bottlenecks?.step1_pending && bottlenecks.step1_pending > 100 ? 'Step 1' :
                 bottlenecks?.unipile_pending && bottlenecks.unipile_pending > 200 ? 'Unipile' :
                 'Normal'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions de maintenance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Actions de Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleRetryErrorPosts}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Retry Posts en Erreur
              {bottlenecks && (
                <Badge variant="secondary">
                  ~{Math.floor((bottlenecks.total_processing * 0.1))} posts
                </Badge>
              )}
            </Button>

            <Button
              onClick={handleRetryStuckPosts}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              Retry Posts Bloqués
              {bottlenecks && (
                <Badge variant="secondary">
                  {bottlenecks.older_than_24h} posts
                </Badge>
              )}
            </Button>

            <Button
              onClick={handleCollectMetrics}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Collecter Métriques
            </Button>

            <Button
              onClick={handleDeleteFailedPosts}
              disabled={loading}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Nettoyer Échecs
              <Badge variant="outline" className="text-white border-white">
                Définitif
              </Badge>
            </Button>
          </div>

          {urgencyLevel === 'critical' && (
            <div className="p-4 bg-red-100 rounded-lg border border-red-200">
              <p className="text-red-800 font-medium">Actions recommandées :</p>
              <ul className="text-red-700 text-sm mt-1 space-y-1">
                <li>• Retry immédiat des posts bloqués depuis plus de 24h</li>
                <li>• Vérifier les logs des fonctions edge</li>
                {bottlenecks?.step1_pending && bottlenecks.step1_pending > 200 && (
                  <li>• Problème possible avec l&apos;API OpenAI</li>
                )}
                {bottlenecks?.unipile_pending && bottlenecks.unipile_pending > 200 && (
                  <li>• Problème possible avec l&apos;API Unipile</li>
                )}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminActions;

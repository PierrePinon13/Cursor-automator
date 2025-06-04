
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, BarChart, TrendingUp } from 'lucide-react';
import { useDatasetProcessingStats } from '@/hooks/useDatasetProcessingStats';
import ProcessingStatsChart from './ProcessingStatsChart';
import ProcessingStatsTable from './ProcessingStatsTable';
import { DisplayModeSelector } from '@/components/dashboard/DisplayModeSelector';

type TimePeriod = '24h' | '7d' | '30d' | 'all';
type ViewMode = 'global' | 'evolution';
type DisplayMode = 'stats' | 'evolution';

const ProcessingStatsSection = () => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('7d');
  const [viewMode, setViewMode] = useState<ViewMode>('global');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('stats');

  const { 
    globalStats, 
    evolutionData, 
    datasetsList, 
    loading, 
    refetch 
  } = useDatasetProcessingStats(timePeriod, viewMode);

  const timeOptions = [
    { value: '24h', label: '24h' },
    { value: '7d', label: '7 jours' },
    { value: '30d', label: '30 jours' },
    { value: 'all', label: 'Tout' }
  ];

  // Calculer les stats globales de la période
  const totalStats = globalStats.reduce((acc, stat) => ({
    total_records: acc.total_records + stat.total_records,
    raw_posts_stored: acc.raw_posts_stored + stat.raw_posts_stored,
    posts_stored: acc.posts_stored + stat.posts_stored,
    leads_created: acc.leads_created + stat.leads_created,
    datasets_processed: acc.datasets_processed + stat.datasets_processed
  }), {
    total_records: 0,
    raw_posts_stored: 0,
    posts_stored: 0,
    leads_created: 0,
    datasets_processed: 0
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Statistiques d'exécutions</h3>
        <div className="flex gap-2">
          <Select 
            value={timePeriod} 
            onValueChange={(value: TimePeriod) => setTimePeriod(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'global' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('global')}
            >
              Global
            </Button>
            <Button
              variant={viewMode === 'evolution' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('evolution')}
            >
              Évolution
            </Button>
          </div>

          <DisplayModeSelector 
            mode={displayMode} 
            onModeChange={setDisplayMode}
          />
          
          <Button onClick={refetch} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Résumé global */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {totalStats.total_records.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Records reçus</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {totalStats.raw_posts_stored.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Posts raw stockés</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {totalStats.posts_stored.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Posts filtrés</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {totalStats.leads_created.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Leads créés</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">
              {totalStats.datasets_processed}
            </div>
            <p className="text-xs text-muted-foreground">Datasets traités</p>
          </CardContent>
        </Card>
      </div>

      {/* Graphique ou tableau selon le mode d'affichage */}
      {displayMode === 'evolution' ? (
        <ProcessingStatsChart
          viewMode={viewMode}
          globalStats={globalStats}
          evolutionData={evolutionData}
          loading={loading}
        />
      ) : (
        <ProcessingStatsTable
          viewMode={viewMode}
          globalStats={globalStats}
          evolutionData={evolutionData}
          loading={loading}
        />
      )}

      {/* Info sur les datasets disponibles */}
      {datasetsList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Datasets traités récemment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {datasetsList.slice(0, 10).map((datasetId) => (
                <span 
                  key={datasetId}
                  className="text-xs bg-gray-100 px-2 py-1 rounded font-mono"
                >
                  {datasetId.substring(0, 8)}...
                </span>
              ))}
              {datasetsList.length > 10 && (
                <span className="text-xs text-gray-500">
                  +{datasetsList.length - 10} autres
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProcessingStatsSection;


import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, BarChart, TrendingUp } from 'lucide-react';
import { useDatasetProcessingStats } from '@/hooks/useDatasetProcessingStats';
import ProcessingStatsChart from './ProcessingStatsChart';
import ProcessingStatsTable from './ProcessingStatsTable';
import { DisplayModeSelector } from '@/components/dashboard/DisplayModeSelector';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type TimePeriod = '24h' | '7d' | '30d' | 'all';
type ViewMode = 'global' | 'evolution';
type DisplayMode = 'stats' | 'evolution';

const ProcessingStatsSection = () => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('7d');
  const [viewMode, setViewMode] = useState<ViewMode>('global');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('stats');
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | undefined>(undefined);

  const { 
    globalStats, 
    evolutionData, 
    datasetHistory,
    datasetsList, 
    loading, 
    refetch 
  } = useDatasetProcessingStats(timePeriod, viewMode, selectedDatasetId);

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

  const handleDatasetSelect = (datasetId: string) => {
    if (datasetId === 'all') {
      setSelectedDatasetId(undefined);
    } else {
      setSelectedDatasetId(datasetId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-lg font-semibold">Statistiques d'exécutions</h3>
        <div className="flex gap-2 flex-wrap">
          <Select 
            value={selectedDatasetId || 'all'} 
            onValueChange={handleDatasetSelect}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sélectionner un dataset" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les datasets</SelectItem>
              {datasetsList.map((datasetId) => (
                <SelectItem key={datasetId} value={datasetId}>
                  {datasetId.substring(0, 12)}...
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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

      {/* Historique des datasets */}
      {!selectedDatasetId && datasetHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historique des datasets traités</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dataset ID</TableHead>
                  <TableHead>Date traitement</TableHead>
                  <TableHead>Records reçus</TableHead>
                  <TableHead>Posts raw</TableHead>
                  <TableHead>Posts filtrés</TableHead>
                  <TableHead>Leads créés</TableHead>
                  <TableHead>Taux conversion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datasetHistory.map((dataset) => {
                  const conversionRate = dataset.total_records > 0 
                    ? ((dataset.leads_created / dataset.total_records) * 100).toFixed(1)
                    : '0';
                  
                  return (
                    <TableRow 
                      key={dataset.dataset_id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleDatasetSelect(dataset.dataset_id)}
                    >
                      <TableCell className="font-mono text-xs">
                        <Button variant="link" className="p-0 h-auto font-mono text-xs">
                          {dataset.dataset_id.substring(0, 12)}...
                        </Button>
                      </TableCell>
                      <TableCell>
                        {new Date(dataset.processing_date).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {dataset.total_records.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-blue-600">
                        {dataset.raw_posts_stored.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-green-600">
                        {dataset.posts_stored.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-purple-600 font-medium">
                        {dataset.leads_created.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={parseFloat(conversionRate) > 5 ? "default" : "secondary"}>
                          {conversionRate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProcessingStatsSection;

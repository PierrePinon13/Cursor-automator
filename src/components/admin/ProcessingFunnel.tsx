
import { useState } from 'react';
import { useFunnelMetrics } from '@/hooks/useFunnelMetrics';
import { useFunnelEvolution } from '@/hooks/useFunnelEvolution';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FunnelFilters from './FunnelFilters';
import FunnelChart from './FunnelChart';

export interface ProcessingFunnelProps {
  timeFilter?: string;
}

const ProcessingFunnel = ({ timeFilter = '24h' }: ProcessingFunnelProps) => {
  const [selectedTimeFilter, setSelectedTimeFilter] = useState(timeFilter);
  const { data: metrics, loading: metricsLoading } = useFunnelMetrics(selectedTimeFilter);
  const { data: evolution, loading: evolutionLoading } = useFunnelEvolution(selectedTimeFilter);

  const loading = metricsLoading || evolutionLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FunnelFilters
        timeFilter={selectedTimeFilter}
        onTimeFilterChange={setSelectedTimeFilter}
      />
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Métriques du funnel de traitement</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart metrics={metrics} evolution={evolution} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProcessingFunnel;

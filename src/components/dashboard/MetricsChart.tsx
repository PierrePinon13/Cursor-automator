
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useProcessingMetricsHistory } from '@/hooks/useProcessingMetricsHistory';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricsChartProps {
  hours?: number;
}

const MetricsChart = ({ hours = 24 }: MetricsChartProps) => {
  const { metricsHistory, loading } = useProcessingMetricsHistory(hours);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metricsHistory.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Évolution des Taux de Conversion</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Aucune donnée historique disponible pour les dernières {hours}h
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatData = metricsHistory.map(point => ({
    time: new Date(point.hour_timestamp).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    step1: point.step1_conversion_rate,
    step2: point.step2_conversion_rate,
    step3: point.step3_conversion_rate,
    volume: point.total_posts_processed,
    errors: point.error_rate,
  }));

  // Calculer les tendances
  const getTrend = (values: number[]) => {
    if (values.length < 2) return 'stable';
    const recent = values.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, values.length);
    const previous = values.slice(-6, -3).reduce((a, b) => a + b, 0) / Math.min(3, values.length);
    
    if (recent > previous + 5) return 'up';
    if (recent < previous - 5) return 'down';
    return 'stable';
  };

  const step1Values = formatData.map(d => d.step1);
  const step2Values = formatData.map(d => d.step2);
  const step3Values = formatData.map(d => d.step3);

  const step1Trend = getTrend(step1Values);
  const step2Trend = getTrend(step2Values);
  const step3Trend = getTrend(step3Values);

  const TrendIcon = ({ trend }: { trend: string }) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Évolution des Taux de Conversion
          <div className="flex gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <TrendIcon trend={step1Trend} />
              Step 1
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <TrendIcon trend={step2Trend} />
              Step 2
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <TrendIcon trend={step3Trend} />
              Step 3
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={formatData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={[0, 100]} />
            <Tooltip 
              formatter={(value: number, name: string) => [
                `${value.toFixed(1)}%`, 
                name === 'step1' ? 'Step 1' : name === 'step2' ? 'Step 2' : 'Step 3'
              ]}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="step1" 
              stroke="#2563eb" 
              strokeWidth={2}
              name="Step 1"
            />
            <Line 
              type="monotone" 
              dataKey="step2" 
              stroke="#16a34a" 
              strokeWidth={2}
              name="Step 2"
            />
            <Line 
              type="monotone" 
              dataKey="step3" 
              stroke="#dc2626" 
              strokeWidth={2}
              name="Step 3"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default MetricsChart;

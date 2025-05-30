
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFunnelMetrics } from '@/hooks/useFunnelMetrics';
import { useFunnelEvolution } from '@/hooks/useFunnelEvolution';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer } from 'recharts';

interface FunnelChartProps {
  timeFilter: string;
}

const FunnelChart = ({ timeFilter }: FunnelChartProps) => {
  const [viewMode, setViewMode] = useState<'global' | 'evolution'>('global');
  const { metrics, loading: metricsLoading } = useFunnelMetrics(timeFilter);
  const { evolutionData, loading: evolutionLoading } = useFunnelEvolution(timeFilter);

  const loading = metricsLoading || evolutionLoading;

  // Configuration pour les couleurs du graphique
  const chartConfig = {
    'apify-received': { color: '#3b82f6' },
    'person-filter': { color: '#10b981' },
    'openai-step1': { color: '#f59e0b' },
    'openai-step2': { color: '#ef4444' },
    'openai-step3': { color: '#8b5cf6' },
    'unipile-scraped': { color: '#06b6d4' },
    'added-to-leads': { color: '#84cc16' },
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Chargement du graphique...</div>
        </CardContent>
      </Card>
    );
  }

  const renderGlobalView = () => {
    if (!metrics?.steps) return null;

    const chartData = metrics.steps.map(step => ({
      name: step.description,
      value: step.count,
      percentage: step.percentage,
      step: step.step
    }));

    return (
      <ChartContainer config={chartConfig} className="h-96">
        <BarChart data={chartData} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" width={200} />
          <ChartTooltip 
            content={<ChartTooltipContent />}
            formatter={(value, name) => [
              `${value} (${chartData.find(d => d.name === name)?.percentage.toFixed(1)}%)`,
              'Nombre'
            ]}
          />
          <Bar 
            dataKey="value" 
            fill="#3b82f6"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ChartContainer>
    );
  };

  const renderEvolutionView = () => {
    if (!evolutionData || evolutionData.length === 0) {
      return (
        <div className="text-center text-gray-500 py-8">
          Pas de données d'évolution disponibles pour cette période
        </div>
      );
    }

    const steps = [
      { key: 'apify_received_rate', label: 'Posts reçus', color: chartConfig['apify-received'].color },
      { key: 'person_filter_rate', label: 'Filtre Person', color: chartConfig['person-filter'].color },
      { key: 'step1_rate', label: 'OpenAI Step 1', color: chartConfig['openai-step1'].color },
      { key: 'step2_rate', label: 'OpenAI Step 2', color: chartConfig['openai-step2'].color },
      { key: 'step3_rate', label: 'OpenAI Step 3', color: chartConfig['openai-step3'].color },
      { key: 'unipile_rate', label: 'Unipile Scraped', color: chartConfig['unipile-scraped'].color },
      { key: 'leads_rate', label: 'Ajoutés aux leads', color: chartConfig['added-to-leads'].color },
    ];

    return (
      <ChartContainer config={chartConfig} className="h-96">
        <LineChart data={evolutionData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { 
              month: 'short', 
              day: 'numeric' 
            })}
          />
          <YAxis 
            label={{ value: 'Pourcentage (%)', angle: -90, position: 'insideLeft' }}
            domain={[0, 100]}
          />
          <ChartTooltip 
            content={<ChartTooltipContent />}
            labelFormatter={(value) => new Date(value).toLocaleDateString('fr-FR')}
            formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name]}
          />
          {steps.map((step) => (
            <Line
              key={step.key}
              type="monotone"
              dataKey={step.key}
              stroke={step.color}
              strokeWidth={2}
              dot={{ fill: step.color, r: 3 }}
              name={step.label}
            />
          ))}
        </LineChart>
      </ChartContainer>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Analyse du Funnel</CardTitle>
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
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'global' ? renderGlobalView() : renderEvolutionView()}
      </CardContent>
    </Card>
  );
};

export default FunnelChart;

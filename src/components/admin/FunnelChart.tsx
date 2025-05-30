
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFunnelMetrics } from '@/hooks/useFunnelMetrics';
import { useFunnelEvolution } from '@/hooks/useFunnelEvolution';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
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
    'apify_received_rate': { 
      color: '#3b82f6',
      label: 'Posts reçus'
    },
    'person_filter_rate': { 
      color: '#10b981',
      label: 'Filtre Person'
    },
    'step1_rate': { 
      color: '#f59e0b',
      label: 'OpenAI Step 1'
    },
    'step2_rate': { 
      color: '#ef4444',
      label: 'OpenAI Step 2'
    },
    'step3_rate': { 
      color: '#8b5cf6',
      label: 'OpenAI Step 3'
    },
    'unipile_rate': { 
      color: '#06b6d4',
      label: 'Unipile Scraped'
    },
    'leads_rate': { 
      color: '#84cc16',
      label: 'Ajoutés aux leads'
    },
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
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 30, left: 150, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={140} />
            <ChartTooltip 
              content={<ChartTooltipContent />}
              formatter={(value, name, props) => [
                `${value} (${props.payload.percentage.toFixed(1)}%)`,
                'Nombre'
              ]}
            />
            <Bar 
              dataKey="value" 
              fill="#3b82f6"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
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

    return (
      <div className="space-y-4">
        <ChartContainer config={chartConfig} className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolutionData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
                formatter={(value, name) => [
                  `${Number(value).toFixed(1)}%`, 
                  chartConfig[name as keyof typeof chartConfig]?.label || name
                ]}
              />
              <ChartLegend content={<ChartLegendContent />} />
              
              <Line
                type="monotone"
                dataKey="apify_received_rate"
                stroke={chartConfig.apify_received_rate.color}
                strokeWidth={2}
                dot={{ fill: chartConfig.apify_received_rate.color, r: 3 }}
                name="apify_received_rate"
              />
              <Line
                type="monotone"
                dataKey="person_filter_rate"
                stroke={chartConfig.person_filter_rate.color}
                strokeWidth={2}
                dot={{ fill: chartConfig.person_filter_rate.color, r: 3 }}
                name="person_filter_rate"
              />
              <Line
                type="monotone"
                dataKey="step1_rate"
                stroke={chartConfig.step1_rate.color}
                strokeWidth={2}
                dot={{ fill: chartConfig.step1_rate.color, r: 3 }}
                name="step1_rate"
              />
              <Line
                type="monotone"
                dataKey="step2_rate"
                stroke={chartConfig.step2_rate.color}
                strokeWidth={2}
                dot={{ fill: chartConfig.step2_rate.color, r: 3 }}
                name="step2_rate"
              />
              <Line
                type="monotone"
                dataKey="step3_rate"
                stroke={chartConfig.step3_rate.color}
                strokeWidth={2}
                dot={{ fill: chartConfig.step3_rate.color, r: 3 }}
                name="step3_rate"
              />
              <Line
                type="monotone"
                dataKey="unipile_rate"
                stroke={chartConfig.unipile_rate.color}
                strokeWidth={2}
                dot={{ fill: chartConfig.unipile_rate.color, r: 3 }}
                name="unipile_rate"
              />
              <Line
                type="monotone"
                dataKey="leads_rate"
                stroke={chartConfig.leads_rate.color}
                strokeWidth={2}
                dot={{ fill: chartConfig.leads_rate.color, r: 3 }}
                name="leads_rate"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
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

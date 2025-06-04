
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer } from 'recharts';
import { GlobalProcessingStats, DatasetProcessingStats } from '@/hooks/useDatasetProcessingStats';

interface ProcessingStatsChartProps {
  viewMode: 'global' | 'evolution';
  globalStats: GlobalProcessingStats[];
  evolutionData: DatasetProcessingStats[];
  loading: boolean;
}

const ProcessingStatsChart = ({ viewMode, globalStats, evolutionData, loading }: ProcessingStatsChartProps) => {
  const chartConfig = {
    total_records: { 
      color: '#3b82f6',
      label: 'Records reçus'
    },
    raw_posts_stored: { 
      color: '#10b981',
      label: 'Posts raw stockés'
    },
    posts_stored: { 
      color: '#f59e0b',
      label: 'Posts filtrés stockés'
    },
    leads_created: { 
      color: '#ef4444',
      label: 'Leads créés'
    },
    datasets_processed: {
      color: '#8b5cf6',
      label: 'Datasets traités'
    }
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
    if (globalStats.length === 0) {
      return (
        <div className="text-center text-gray-500 py-8">
          Aucune donnée disponible pour cette période
        </div>
      );
    }

    return (
      <ChartContainer config={chartConfig} className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={globalStats} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            
            <Bar dataKey="total_records" fill={chartConfig.total_records.color} name="total_records" />
            <Bar dataKey="raw_posts_stored" fill={chartConfig.raw_posts_stored.color} name="raw_posts_stored" />
            <Bar dataKey="posts_stored" fill={chartConfig.posts_stored.color} name="posts_stored" />
            <Bar dataKey="leads_created" fill={chartConfig.leads_created.color} name="leads_created" />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    );
  };

  const renderEvolutionView = () => {
    if (evolutionData.length === 0) {
      return (
        <div className="text-center text-gray-500 py-8">
          Pas de données d'évolution disponibles pour cette période
        </div>
      );
    }

    // Grouper les données par date pour l'évolution
    const groupedData = evolutionData.reduce((acc, item) => {
      const date = item.processing_date;
      if (!acc[date]) {
        acc[date] = {
          date,
          total_records: 0,
          raw_posts_stored: 0,
          posts_stored: 0,
          leads_created: 0
        };
      }
      
      acc[date].total_records += item.total_records;
      acc[date].raw_posts_stored += item.raw_posts_stored;
      acc[date].posts_stored += item.posts_stored;
      acc[date].leads_created += item.leads_created;
      
      return acc;
    }, {} as Record<string, any>);

    const chartData = Object.values(groupedData).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return (
      <ChartContainer config={chartConfig} className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { 
                month: 'short', 
                day: 'numeric' 
              })}
            />
            <YAxis />
            <ChartTooltip 
              content={<ChartTooltipContent />}
              labelFormatter={(value) => new Date(value).toLocaleDateString('fr-FR')}
            />
            <ChartLegend content={<ChartLegendContent />} />
            
            <Line
              type="monotone"
              dataKey="total_records"
              stroke={chartConfig.total_records.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              name="total_records"
            />
            <Line
              type="monotone"
              dataKey="raw_posts_stored"
              stroke={chartConfig.raw_posts_stored.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              name="raw_posts_stored"
            />
            <Line
              type="monotone"
              dataKey="posts_stored"
              stroke={chartConfig.posts_stored.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              name="posts_stored"
            />
            <Line
              type="monotone"
              dataKey="leads_created"
              stroke={chartConfig.leads_created.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              name="leads_created"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Statistiques de traitement</CardTitle>
      </CardHeader>
      <CardContent>
        {viewMode === 'global' ? renderGlobalView() : renderEvolutionView()}
      </CardContent>
    </Card>
  );
};

export default ProcessingStatsChart;

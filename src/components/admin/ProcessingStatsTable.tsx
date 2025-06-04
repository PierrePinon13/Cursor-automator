
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { GlobalProcessingStats, DatasetProcessingStats } from '@/hooks/useDatasetProcessingStats';

interface ProcessingStatsTableProps {
  viewMode: 'global' | 'evolution';
  globalStats: GlobalProcessingStats[];
  evolutionData: DatasetProcessingStats[];
  loading: boolean;
}

const ProcessingStatsTable = ({ viewMode, globalStats, evolutionData, loading }: ProcessingStatsTableProps) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Chargement des données...</div>
        </CardContent>
      </Card>
    );
  }

  const renderGlobalTable = () => {
    if (globalStats.length === 0) {
      return (
        <div className="text-center text-gray-500 py-8">
          Aucune donnée disponible
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Période</TableHead>
            <TableHead>Datasets traités</TableHead>
            <TableHead>Records reçus</TableHead>
            <TableHead>Posts raw stockés</TableHead>
            <TableHead>Posts filtrés</TableHead>
            <TableHead>Leads créés</TableHead>
            <TableHead>Taux conversion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {globalStats.map((stat, index) => {
            const conversionRate = stat.total_records > 0 
              ? ((stat.leads_created / stat.total_records) * 100).toFixed(1)
              : '0';
            
            return (
              <TableRow key={index}>
                <TableCell className="font-medium">{stat.period}</TableCell>
                <TableCell>
                  <Badge variant="outline">{stat.datasets_processed}</Badge>
                </TableCell>
                <TableCell className="font-medium">{stat.total_records.toLocaleString()}</TableCell>
                <TableCell className="text-blue-600">{stat.raw_posts_stored.toLocaleString()}</TableCell>
                <TableCell className="text-green-600">{stat.posts_stored.toLocaleString()}</TableCell>
                <TableCell className="text-purple-600 font-medium">{stat.leads_created.toLocaleString()}</TableCell>
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
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Détail des statistiques</CardTitle>
      </CardHeader>
      <CardContent>
        {renderGlobalTable()}
      </CardContent>
    </Card>
  );
};

export default ProcessingStatsTable;

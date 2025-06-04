
import React from 'react';
import { HrProvidersManagement } from './HrProvidersManagement';
import MistargetedPostsSection from './MistargetedPostsSection';
import ProcessingStatsSection from './ProcessingStatsSection';
import { DatasetReprocessing } from './DatasetReprocessing';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="hr-providers" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="hr-providers">Prestataires RH</TabsTrigger>
          <TabsTrigger value="mistargeted">Posts mal ciblés</TabsTrigger>
          <TabsTrigger value="processing-stats">Statistiques d'exécutions</TabsTrigger>
          <TabsTrigger value="dataset-reprocessing">Retraitement Dataset</TabsTrigger>
        </TabsList>

        <TabsContent value="hr-providers" className="space-y-6">
          <HrProvidersManagement />
        </TabsContent>

        <TabsContent value="mistargeted" className="space-y-6">
          <MistargetedPostsSection />
        </TabsContent>

        <TabsContent value="processing-stats" className="space-y-6">
          <ProcessingStatsSection />
        </TabsContent>

        <TabsContent value="dataset-reprocessing" className="space-y-6">
          <DatasetReprocessing />
        </TabsContent>
      </Tabs>
    </div>
  );
}

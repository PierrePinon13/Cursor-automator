
import React from 'react';
import { HrProvidersManagement } from './HrProvidersManagement';
import MistargetedPostsSection from './MistargetedPostsSection';
import ProcessingStatsSection from './ProcessingStatsSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Administration</h1>
      </div>

      <Tabs defaultValue="hr-providers" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="hr-providers">Prestataires RH</TabsTrigger>
          <TabsTrigger value="mistargeted">Posts mal ciblés</TabsTrigger>
          <TabsTrigger value="processing-stats">Statistiques d'exécutions</TabsTrigger>
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
      </Tabs>
    </div>
  );
}

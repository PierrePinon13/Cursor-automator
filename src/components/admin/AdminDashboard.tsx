
import React from 'react';
import StatsCards from '@/components/dashboard/StatsCards';
import ProcessingFunnel from './ProcessingFunnel';
import ApifyWebhookStats from './ApifyWebhookStats';
import DataProcessingDiagnostics from './DataProcessingDiagnostics';
import DeepDataAnalysis from './DeepDataAnalysis';
import MistargetedPostsSection from './MistargetedPostsSection';
import { HrProvidersManagement } from './HrProvidersManagement';
import { DatasetAudit } from './DatasetAudit';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Administration</h1>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
          <TabsTrigger value="analysis">Analyse</TabsTrigger>
          <TabsTrigger value="audit">Audit Dataset</TabsTrigger>
          <TabsTrigger value="mistargeted">Posts mal ciblés</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <StatsCards 
            linkedinMessages={0}
            positiveCalls={0} 
            negativeCalls={0}
            successRate={0}
          />
          <HrProvidersManagement />
        </TabsContent>

        <TabsContent value="funnel" className="space-y-6">
          <ProcessingFunnel />
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          <ApifyWebhookStats />
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-6">
          <DataProcessingDiagnostics />
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <DeepDataAnalysis />
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <DatasetAudit />
        </TabsContent>

        <TabsContent value="mistargeted" className="space-y-6">
          <MistargetedPostsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}


import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProcessingStatsSection from './ProcessingStatsSection';
import DatasetReprocessing from './DatasetReprocessing';
import AutomaticDatasetReprocessing from './AutomaticDatasetReprocessing';
import DeepDataAnalysis from './DeepDataAnalysis';
import DataProcessingDiagnostics from './DataProcessingDiagnostics';
import ProcessingFunnel from './ProcessingFunnel';
import MistargetedPostsSection from './MistargetedPostsSection';
import HrProvidersManagement from './HrProvidersManagement';
import WorkflowEventsMonitoring from './WorkflowEventsMonitoring';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Administration</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="funnel">Entonnoir</TabsTrigger>
          <TabsTrigger value="workflow">Workflow Events</TabsTrigger>
          <TabsTrigger value="reprocessing">Retraitement</TabsTrigger>
          <TabsTrigger value="auto-reprocessing">Auto-retraitement</TabsTrigger>
          <TabsTrigger value="analysis">Analyse</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
          <TabsTrigger value="mistargeted">Posts mal ciblés</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ProcessingStatsSection />
          <HrProvidersManagement />
        </TabsContent>

        <TabsContent value="funnel" className="space-y-6">
          <ProcessingFunnel />
        </TabsContent>

        <TabsContent value="workflow" className="space-y-6">
          <WorkflowEventsMonitoring />
        </TabsContent>

        <TabsContent value="reprocessing" className="space-y-6">
          <DatasetReprocessing />
        </TabsContent>

        <TabsContent value="auto-reprocessing" className="space-y-6">
          <AutomaticDatasetReprocessing />
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <DeepDataAnalysis />
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-6">
          <DataProcessingDiagnostics />
        </TabsContent>

        <TabsContent value="mistargeted" className="space-y-6">
          <MistargetedPostsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;

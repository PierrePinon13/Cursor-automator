
import { useState } from 'react';
import AdminDashboard from '@/components/admin/AdminDashboard';
import ProcessingFunnel from '@/components/admin/ProcessingFunnel';
import { HrProvidersManagement } from '@/components/admin/HrProvidersManagement';
import { AutomaticDatasetReprocessing } from '@/components/admin/AutomaticDatasetReprocessing';
import { DatasetReprocessing } from '@/components/admin/DatasetReprocessing';
import { DatasetAudit } from '@/components/admin/DatasetAudit';
import DeepDataAnalysis from '@/components/admin/DeepDataAnalysis';
import WorkflowEventsMonitoring from '@/components/admin/WorkflowEventsMonitoring';
import CompanyEnrichmentAdmin from '@/components/admin/CompanyEnrichmentAdmin';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Admin = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center gap-4 mb-6">
        <SidebarTrigger />
        <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="funnel">Entonnoir</TabsTrigger>
          <TabsTrigger value="companies">Entreprises</TabsTrigger>
          <TabsTrigger value="hr-providers">HR Providers</TabsTrigger>
          <TabsTrigger value="reprocessing">Retraitement</TabsTrigger>
          <TabsTrigger value="auto-reprocessing">Auto-retraitement</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
          <TabsTrigger value="analysis">Analyse</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <AdminDashboard />
        </TabsContent>

        <TabsContent value="funnel">
          <ProcessingFunnel />
        </TabsContent>

        <TabsContent value="companies">
          <CompanyEnrichmentAdmin />
        </TabsContent>

        <TabsContent value="hr-providers">
          <HrProvidersManagement />
        </TabsContent>

        <TabsContent value="reprocessing">
          <DatasetReprocessing />
        </TabsContent>

        <TabsContent value="auto-reprocessing">
          <AutomaticDatasetReprocessing />
        </TabsContent>

        <TabsContent value="audit">
          <DatasetAudit />
        </TabsContent>

        <TabsContent value="analysis">
          <DeepDataAnalysis />
        </TabsContent>

        <TabsContent value="monitoring">
          <WorkflowEventsMonitoring />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;

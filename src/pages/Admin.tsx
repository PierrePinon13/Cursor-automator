
import { useState } from 'react';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { HrProvidersManagement } from '@/components/admin/HrProvidersManagement';
import { DatasetReprocessing } from '@/components/admin/DatasetReprocessing';
import CompanyEnrichmentAdmin from '@/components/admin/CompanyEnrichmentAdmin';
import { DailyJobsTrigger } from '@/components/admin/DailyJobsTrigger';
import UnipileAccountsManagement from '@/components/admin/UnipileAccountsManagement';
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="companies">Entreprises</TabsTrigger>
          <TabsTrigger value="jobs">Offres Jobs</TabsTrigger>
          <TabsTrigger value="hr-providers">HR Providers</TabsTrigger>
          <TabsTrigger value="reprocessing">Retraitement</TabsTrigger>
          <TabsTrigger value="unipile-accounts">Comptes Unipile</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <AdminDashboard />
        </TabsContent>

        <TabsContent value="companies">
          <CompanyEnrichmentAdmin />
        </TabsContent>

        <TabsContent value="jobs">
          <DailyJobsTrigger />
        </TabsContent>

        <TabsContent value="hr-providers">
          <HrProvidersManagement />
        </TabsContent>

        <TabsContent value="reprocessing">
          <DatasetReprocessing />
        </TabsContent>

        <TabsContent value="unipile-accounts">
          <UnipileAccountsManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;

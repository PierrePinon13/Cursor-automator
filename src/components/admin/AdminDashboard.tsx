
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProcessingStatsSection from './ProcessingStatsSection';
import { DatasetReprocessing } from './DatasetReprocessing';
import MistargetedPostsSection from './MistargetedPostsSection';
import { HrProvidersManagement } from './HrProvidersManagement';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Administration</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="reprocessing">Retraitement</TabsTrigger>
          <TabsTrigger value="hr-providers">Prestataires RH</TabsTrigger>
          <TabsTrigger value="mistargeted">Posts mal ciblés</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ProcessingStatsSection />
        </TabsContent>

        <TabsContent value="reprocessing" className="space-y-6">
          <DatasetReprocessing />
        </TabsContent>

        <TabsContent value="hr-providers" className="space-y-6">
          <HrProvidersManagement />
        </TabsContent>

        <TabsContent value="mistargeted" className="space-y-6">
          <MistargetedPostsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;

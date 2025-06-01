
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProcessingFunnel from '@/components/admin/ProcessingFunnel';
import ApifyWebhookStats from '@/components/admin/ApifyWebhookStats';
import MistargetedPostsSection from '@/components/admin/MistargetedPostsSection';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';

const Admin = () => {
  const { isAdmin, loading } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <CardContent className="text-center py-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
            <p className="text-gray-600">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
          <p className="mt-2 text-gray-600">Gestion et monitoring du système</p>
        </div>

        <Tabs defaultValue="funnel" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="funnel">Funnel de traitement</TabsTrigger>
            <TabsTrigger value="webhooks">Statistiques Apify</TabsTrigger>
            <TabsTrigger value="mistargeted">Publications mal ciblées</TabsTrigger>
          </TabsList>

          <TabsContent value="funnel" className="space-y-6">
            <ProcessingFunnel />
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-6">
            <ApifyWebhookStats />
          </TabsContent>

          <TabsContent value="mistargeted" className="space-y-6">
            <MistargetedPostsSection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;

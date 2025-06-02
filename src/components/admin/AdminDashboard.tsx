
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProcessingFunnel from './ProcessingFunnel';
import ApifyWebhookStats from './ApifyWebhookStats';
import MistargetedPostsSection from './MistargetedPostsSection';
import DataProcessingDiagnostics from './DataProcessingDiagnostics';
import DeepDataAnalysis from './DeepDataAnalysis';
import { HrProvidersManagement } from './HrProvidersManagement';

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
        <p className="mt-2 text-gray-600">Gestion et monitoring du système</p>
      </div>

      <Tabs defaultValue="deep-analysis" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="deep-analysis">Analyse Approfondie</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostic Standard</TabsTrigger>
          <TabsTrigger value="funnel">Funnel de traitement</TabsTrigger>
          <TabsTrigger value="webhooks">Statistiques Apify</TabsTrigger>
          <TabsTrigger value="mistargeted">Publications mal ciblées</TabsTrigger>
          <TabsTrigger value="hr-providers">Prestataires RH</TabsTrigger>
        </TabsList>

        <TabsContent value="deep-analysis" className="space-y-6">
          <DeepDataAnalysis />
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-6">
          <DataProcessingDiagnostics />
        </TabsContent>

        <TabsContent value="funnel" className="space-y-6">
          <ProcessingFunnel />
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          <ApifyWebhookStats />
        </TabsContent>

        <TabsContent value="mistargeted" className="space-y-6">
          <MistargetedPostsSection />
        </TabsContent>

        <TabsContent value="hr-providers" className="space-y-6">
          <HrProvidersManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}

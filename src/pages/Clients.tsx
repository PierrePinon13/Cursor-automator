
import { useClients } from '@/hooks/useClients';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '@/components/DashboardHeader';
import { JobOffersSection } from '@/components/clients/JobOffersSection';
import { ClientLeadsView } from '@/components/clients/ClientLeadsView';
import { useTabState } from '@/utils/urlState';

const Clients = () => {
  const { clients, loading } = useClients();
  const navigate = useNavigate();
  const [activeTab, handleTabChange] = useTabState('job-offers', '/clients');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Chargement des clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      {/* Nouveau header harmonisé */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Users className="h-6 w-6 text-indigo-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
              <p className="text-sm text-gray-600">Gérez les clients, leurs offres et publications</p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/client-settings')}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Gestion clients
          </Button>
        </div>
        <div className="mt-6 flex">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="job-offers">Offres d'emploi</TabsTrigger>
              <TabsTrigger value="linkedin-posts">Publications LinkedIn</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Contenu bord à bord, sobre */}
      <main className="flex-1 px-0 sm:px-6 py-8">
        <div className="max-w-7xl mx-auto w-full">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsContent value="job-offers" className="space-y-6 mt-0">
              <JobOffersSection />
            </TabsContent>

            <TabsContent value="linkedin-posts" className="space-y-6 mt-0">
              <ClientLeadsView />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Clients;


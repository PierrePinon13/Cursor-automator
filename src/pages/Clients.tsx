import { useClients } from '@/hooks/useClients';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '@/components/DashboardHeader';
import { JobOffersSection } from '@/components/clients/JobOffersSection';
import { ClientLeadsView } from '@/components/clients/ClientLeadsView';
import { useTabState } from '@/utils/urlState';
import { SidebarTrigger } from '@/components/ui/sidebar';

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
    <div className="min-h-screen bg-gray-50">
      {/* Header intégré, harmonisé comme sur Leads */}
      <div className="px-6 pt-6 pb-4 bg-gray-50">
        <div className="flex items-center justify-between mb-6 w-full">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
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
        {/* Ici tu pourras ajouter des filtres ou une barre de recherche comme sur Leads si besoin */}
      </div>
      {/* Contenu principal, suppression du Tabs pour un layout plus direct comme Leads */}
      <main className="bg-white px-0 sm:px-6 py-8">
        <div className="max-w-7xl mx-auto w-full">
          {/* Affichage direct des jobs/offres, à adapter selon la logique métier */}
          <JobOffersSection />
          {/* Tu peux ajouter ici d'autres sections ou composants pour harmoniser avec Leads */}
        </div>
      </main>
    </div>
  );
};

export default Clients;


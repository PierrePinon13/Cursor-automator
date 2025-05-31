
import { useState } from 'react';
import { useClients } from '@/hooks/useClients';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { JobOffersSection } from '@/components/clients/JobOffersSection';
import { ClientManagement } from '@/components/clients/ClientManagement';
import UserActionsDropdown from '@/components/UserActionsDropdown';

const Clients = () => {
  const { loading } = useClients();
  const [showManagement, setShowManagement] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold text-gray-900">
            {showManagement ? '' : 'Offres d\'emploi'}
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowManagement(!showManagement)}
            variant={showManagement ? "default" : "outline"}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            {showManagement ? 'Voir les offres' : 'Gestion'}
          </Button>
          <UserActionsDropdown />
        </div>
      </div>

      {showManagement ? (
        <ClientManagement />
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <JobOffersSection />
        </div>
      )}
    </div>
  );
};

export default Clients;

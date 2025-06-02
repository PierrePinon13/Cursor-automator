
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
    <div className="min-h-screen bg-white">
      {/* Nouvelle barre de navigation unifiée */}
      <div className="flex items-center justify-between px-3 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-6">
          <SidebarTrigger />
          
          {/* Navigation principale avec nouveau style */}
          <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200">
            <button
              onClick={() => setShowManagement(false)}
              className={`
                px-6 py-2.5 rounded-md text-sm font-medium transition-all duration-200
                ${!showManagement 
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                }
              `}
            >
              Offres d'emploi
            </button>
            <button
              onClick={() => setShowManagement(false)}
              className={`
                px-6 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ml-1
                ${false 
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                }
              `}
            >
              Publications LinkedIn
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowManagement(!showManagement)}
            variant={showManagement ? "default" : "outline"}
            className="flex items-center gap-2"
            size="sm"
          >
            <Settings className="h-4 w-4" />
            Gestion
          </Button>
          <UserActionsDropdown />
        </div>
      </div>

      {/* Contenu avec padding réduit */}
      <div className="p-4">
        {showManagement ? (
          <ClientManagement />
        ) : (
          <JobOffersSection />
        )}
      </div>
    </div>
  );
};

export default Clients;

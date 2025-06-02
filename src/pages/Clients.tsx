
import { useState } from 'react';
import { useClients } from '@/hooks/useClients';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { JobOffersSection } from '@/components/clients/JobOffersSection';
import { ClientManagement } from '@/components/clients/ClientManagement';
import { ClientLeadsView } from '@/components/clients/ClientLeadsView';
import UserActionsDropdown from '@/components/UserActionsDropdown';

const Clients = () => {
  const { loading } = useClients();
  const [showManagement, setShowManagement] = useState(false);
  const [activeTab, setActiveTab] = useState('job-offers');

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
      {/* Barre de navigation principale */}
      <div className="flex items-center justify-between px-6 py-4 bg-white">
        <div className="flex items-center gap-6">
          <SidebarTrigger />
        </div>
        
        {/* Navigation centrée et élargie */}
        <div className="flex items-center justify-center flex-1">
          <div className="flex items-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-1.5 border border-blue-200/60 shadow-sm">
            <button
              onClick={() => {
                setShowManagement(false);
                setActiveTab('job-offers');
              }}
              className={`
                px-8 py-3 rounded-lg text-sm font-semibold transition-all duration-300 min-w-[160px]
                ${!showManagement && activeTab === 'job-offers'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md transform scale-105' 
                  : 'text-blue-700 hover:text-blue-800 hover:bg-blue-100/70'
                }
              `}
            >
              Offres d'emploi
            </button>
            <button
              onClick={() => {
                setShowManagement(false);
                setActiveTab('client-posts');
              }}
              className={`
                px-8 py-3 rounded-lg text-sm font-semibold transition-all duration-300 ml-2 min-w-[160px]
                ${!showManagement && activeTab === 'client-posts'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md transform scale-105' 
                  : 'text-purple-700 hover:text-purple-800 hover:bg-purple-100/70'
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

      {/* Contenu */}
      <div className="p-4">
        {showManagement ? (
          <ClientManagement />
        ) : activeTab === 'job-offers' ? (
          <JobOffersSection />
        ) : (
          <ClientLeadsView />
        )}
      </div>
    </div>
  );
};

export default Clients;

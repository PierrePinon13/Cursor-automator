
import { useState, useEffect } from 'react';
import { useClients } from '@/hooks/useClients';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import DashboardHeader from '@/components/DashboardHeader';
import { JobOffersSection } from '@/components/clients/JobOffersSection';
import { ClientLeadsView } from '@/components/clients/ClientLeadsView';
import { ClientManagement } from '@/components/clients/ClientManagement';
import { updateUrlWithSubPage, getSubPageFromUrl } from '@/utils/urlState';

const Clients = () => {
  const { clients, loading } = useClients();
  const [showManagement, setShowManagement] = useState(false);
  
  // Get initial tab from URL or default to 'job-offers'
  const [activeTab, setActiveTab] = useState(() => getSubPageFromUrl('job-offers'));

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    updateUrlWithSubPage('/clients', value);
  };

  // Update URL on initial load
  useEffect(() => {
    updateUrlWithSubPage('/clients', activeTab);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Chargement des clients...</p>
        </div>
      </div>
    );
  }

  if (showManagement) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <DashboardHeader 
            title="Gestion des Clients" 
            subtitle="Administration et configuration des clients"
          />
          <Button
            variant="outline"
            onClick={() => setShowManagement(false)}
          >
            Retour
          </Button>
        </div>
        <ClientManagement />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <DashboardHeader 
          title="Clients" 
          subtitle="Offres d'emploi et publications LinkedIn"
        />
        <Button
          onClick={() => setShowManagement(true)}
          className="flex items-center gap-2"
        >
          <Users className="h-4 w-4" />
          Gestion clients
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="job-offers">Offres d'emploi</TabsTrigger>
          <TabsTrigger value="linkedin-posts">Publications LinkedIn</TabsTrigger>
        </TabsList>

        <TabsContent value="job-offers" className="space-y-6">
          <JobOffersSection />
        </TabsContent>

        <TabsContent value="linkedin-posts" className="space-y-6">
          <ClientLeadsView />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Clients;

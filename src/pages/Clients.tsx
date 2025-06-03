
import { useState, useEffect } from 'react';
import { useClients } from '@/hooks/useClients';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '@/components/DashboardHeader';
import { JobOffersSection } from '@/components/clients/JobOffersSection';
import { ClientLeadsView } from '@/components/clients/ClientLeadsView';
import { updateUrlWithSubPage, getSubPageFromUrl } from '@/utils/urlState';

const Clients = () => {
  const { clients, loading } = useClients();
  const navigate = useNavigate();
  
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

  return (
    <div className="space-y-6">
      <DashboardHeader
        centerContent={
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="job-offers">Offres d'emploi</TabsTrigger>
              <TabsTrigger value="linkedin-posts">Publications LinkedIn</TabsTrigger>
            </TabsList>
          </Tabs>
        }
        rightActions={
          <Button
            onClick={() => navigate('/client-settings')}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Gestion clients
          </Button>
        }
      />
      
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsContent value="job-offers" className="space-y-6 mt-0">
            <JobOffersSection />
          </TabsContent>

          <TabsContent value="linkedin-posts" className="space-y-6 mt-0">
            <ClientLeadsView />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Clients;

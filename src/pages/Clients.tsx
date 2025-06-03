
import { useState, useEffect } from 'react';
import { useClients } from '@/hooks/useClients';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardHeader } from '@/components/DashboardHeader';
import { ClientsTable } from '@/components/clients/ClientsTable';
import { ContactsList } from '@/components/clients/ContactsList';
import { JobOffersSection } from '@/components/clients/JobOffersSection';
import { ClientLeadsSection } from '@/components/clients/ClientLeadsSection';
import { ClientLeadsView } from '@/components/clients/ClientLeadsView';
import { ClientQualification } from '@/components/clients/ClientQualification';
import { updateUrlWithSubPage, getSubPageFromUrl } from '@/utils/urlState';

const Clients = () => {
  const { clients, loading } = useClients();
  const [selectedClient, setSelectedClient] = useState<any>(null);
  
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
    <div className="space-y-6 p-6">
      <DashboardHeader 
        title="Gestion des Clients" 
        subtitle="Vue d'ensemble et gestion de vos clients"
      />
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="job-offers">Offres d'emploi</TabsTrigger>
          <TabsTrigger value="linkedin-posts">Publications LinkedIn</TabsTrigger>
          <TabsTrigger value="management">Gestion</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="qualification">Qualification</TabsTrigger>
        </TabsList>

        <TabsContent value="job-offers" className="space-y-6">
          <JobOffersSection />
        </TabsContent>

        <TabsContent value="linkedin-posts" className="space-y-6">
          <ClientLeadsView />
        </TabsContent>

        <TabsContent value="management" className="space-y-6">
          <ClientsTable clients={clients} onClientSelect={setSelectedClient} />
        </TabsContent>

        <TabsContent value="contacts" className="space-y-6">
          {selectedClient ? (
            <ContactsList 
              clientId={selectedClient.id} 
              clientName={selectedClient.name}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Sélectionnez un client dans l'onglet "Gestion" pour voir ses contacts
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="qualification" className="space-y-6">
          <ClientQualification />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Clients;

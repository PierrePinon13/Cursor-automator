
import { useState } from 'react';
import { useClients } from '@/hooks/useClients';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Plus, Upload, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ClientsTable } from '@/components/clients/ClientsTable';
import { ClientDialog } from '@/components/clients/ClientDialog';
import { ImportClientsDialog } from '@/components/clients/ImportClientsDialog';
import { IncompleteClientsDialog } from '@/components/clients/IncompleteClientsDialog';

const ClientSettings = () => {
  const navigate = useNavigate();
  const { clients, users, loading } = useClients();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isIncompleteDialogOpen, setIsIncompleteDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);

  // Count incomplete clients
  const incompleteCount = clients.filter(client => 
    !client.company_linkedin_url || !client.company_linkedin_id
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Chargement des clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <Button
            variant="ghost"
            onClick={() => navigate('/clients')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux clients
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres clients</h1>
        </div>
        
        <div className="flex gap-3">
          {incompleteCount > 0 && (
            <Button
              onClick={() => setIsIncompleteDialogOpen(true)}
              variant="outline"
              className="flex items-center gap-2 border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              <AlertCircle className="h-4 w-4" />
              Comptes incomplets ({incompleteCount})
            </Button>
          )}
          <Button
            onClick={() => setIsImportDialogOpen(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Importer CSV
          </Button>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nouveau client
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <ClientsTable 
          clients={clients}
          users={users}
          onEdit={setEditingClient}
        />
      </div>

      <ClientDialog
        open={isCreateDialogOpen || !!editingClient}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingClient(null);
          }
        }}
        client={editingClient}
        users={users}
      />

      <ImportClientsDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
      />

      <IncompleteClientsDialog
        open={isIncompleteDialogOpen}
        onOpenChange={setIsIncompleteDialogOpen}
        clients={clients}
      />
    </div>
  );
};

export default ClientSettings;

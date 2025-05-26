
import { useState } from 'react';
import { useClients } from '@/hooks/useClients';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Plus, Upload } from 'lucide-react';
import { ClientsTable } from '@/components/clients/ClientsTable';
import { ClientDialog } from '@/components/clients/ClientDialog';
import { ImportClientsDialog } from '@/components/clients/ImportClientsDialog';

const Clients = () => {
  const { clients, users, loading } = useClients();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);

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
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        </div>
        
        <div className="flex gap-3">
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
    </div>
  );
};

export default Clients;

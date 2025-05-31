
import { useState } from 'react';
import { useClients } from '@/hooks/useClients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Upload, AlertCircle, Users, Copy, ExternalLink, Search } from 'lucide-react';
import { ResizableTable } from './ResizableTable';
import { ClientDialog } from './ClientDialog';
import { ImportClientsDialog } from './ImportClientsDialog';
import { IncompleteClientsDialog } from './IncompleteClientsDialog';
import { ClientQualification } from './ClientQualification';
import { useToast } from '@/hooks/use-toast';

export function ClientManagement() {
  const { clients, users, loading, generateLinkedInJobsUrl, getUnqualifiedClients } = useClients();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isIncompleteDialogOpen, setIsIncompleteDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [showQualification, setShowQualification] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Count incomplete clients
  const incompleteCount = clients.filter(client => 
    !client.company_linkedin_url || !client.company_linkedin_id
  ).length;

  const unqualifiedCount = getUnqualifiedClients().length;
  const linkedInJobsUrl = generateLinkedInJobsUrl();

  const copyLinkedInUrl = () => {
    if (linkedInJobsUrl) {
      navigator.clipboard.writeText(linkedInJobsUrl);
      toast({
        title: "URL copiée",
        description: "L'URL LinkedIn Jobs a été copiée dans le presse-papiers.",
      });
    }
  };

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

  if (showQualification) {
    return <ClientQualification onBack={() => setShowQualification(false)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {unqualifiedCount > 0 && (
            <Button
              onClick={() => setShowQualification(true)}
              variant="outline"
              className="flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Users className="h-4 w-4" />
              Qualifier clients ({unqualifiedCount})
            </Button>
          )}
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

        {/* URL LinkedIn Jobs - discret en haut à droite */}
        {linkedInJobsUrl && (
          <div className="flex items-center gap-2">
            <Button
              onClick={copyLinkedInUrl}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <Copy className="h-4 w-4" />
              URL LinkedIn
            </Button>
            <Button
              onClick={() => window.open(linkedInJobsUrl, '_blank')}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-900"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Rechercher un client..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="bg-white rounded-lg shadow">
        <ResizableTable 
          clients={clients}
          users={users}
          onEdit={setEditingClient}
          searchTerm={searchTerm}
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
}

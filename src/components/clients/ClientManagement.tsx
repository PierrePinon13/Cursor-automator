
import { useState } from 'react';
import { useClients } from '@/hooks/useClients';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Upload, AlertCircle, ExternalLink, Users } from 'lucide-react';
import { ClientsTable } from './ClientsTable';
import { ClientDialog } from './ClientDialog';
import { ImportClientsDialog } from './ImportClientsDialog';
import { IncompleteClientsDialog } from './IncompleteClientsDialog';
import { ClientQualification } from './ClientQualification';

export function ClientManagement() {
  const { clients, users, loading, generateLinkedInJobsUrl, getUnqualifiedClients } = useClients();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isIncompleteDialogOpen, setIsIncompleteDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [showQualification, setShowQualification] = useState(false);

  // Count incomplete clients
  const incompleteCount = clients.filter(client => 
    !client.company_linkedin_url || !client.company_linkedin_id
  ).length;

  const unqualifiedCount = getUnqualifiedClients().length;
  const linkedInJobsUrl = generateLinkedInJobsUrl();

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
        <h2 className="text-2xl font-bold text-gray-900">Gestion des clients</h2>
      </div>

      {/* LinkedIn Jobs URL Card */}
      {linkedInJobsUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              URL LinkedIn Jobs pour clients suivis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={linkedInJobsUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
              />
              <Button
                onClick={() => window.open(linkedInJobsUrl, '_blank')}
                variant="outline"
                size="sm"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => navigator.clipboard.writeText(linkedInJobsUrl)}
                variant="outline"
                size="sm"
              >
                Copier
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
}

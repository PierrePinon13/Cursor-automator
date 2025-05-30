
import { useState } from 'react';
import { useHrProviders } from '@/hooks/useHrProviders';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Plus, Upload, AlertCircle } from 'lucide-react';
import { HrProvidersTable } from '@/components/hr-providers/HrProvidersTable';
import { HrProviderDialog } from '@/components/hr-providers/HrProviderDialog';
import { ImportHrProvidersDialog } from '@/components/hr-providers/ImportHrProvidersDialog';
import { IncompleteHrProvidersDialog } from '@/components/hr-providers/IncompleteHrProvidersDialog';
import UserActionsDropdown from '@/components/UserActionsDropdown';

const HrProviders = () => {
  const { hrProviders, loading } = useHrProviders();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isIncompleteDialogOpen, setIsIncompleteDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);

  // Count incomplete providers
  const incompleteCount = hrProviders.filter(provider => 
    !provider.company_linkedin_url || !provider.company_linkedin_id
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Chargement des prestataires RH...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold text-gray-900">Prestataires RH</h1>
        </div>
        
        <UserActionsDropdown />
      </div>

      <div className="flex items-center justify-between mb-6">
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
            Nouveau prestataire RH
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <HrProvidersTable 
          hrProviders={hrProviders}
          onEdit={setEditingProvider}
        />
      </div>

      <HrProviderDialog
        open={isCreateDialogOpen || !!editingProvider}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingProvider(null);
          }
        }}
        hrProvider={editingProvider}
      />

      <ImportHrProvidersDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
      />

      <IncompleteHrProvidersDialog
        open={isIncompleteDialogOpen}
        onOpenChange={setIsIncompleteDialogOpen}
        hrProviders={hrProviders}
      />
    </div>
  );
};

export default HrProviders;

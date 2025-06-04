
import { useState } from 'react';
import { useHrProviders } from '@/hooks/useHrProviders';
import { Button } from '@/components/ui/button';
import { Plus, Upload, AlertCircle } from 'lucide-react';
import { HrProvidersTable } from '@/components/hr-providers/HrProvidersTable';
import { HrProviderDialog } from '@/components/hr-providers/HrProviderDialog';
import { ImportHrProvidersDialog } from '@/components/hr-providers/ImportHrProvidersDialog';
import { IncompleteHrProvidersDialog } from '@/components/hr-providers/IncompleteHrProvidersDialog';

export const HrProvidersManagement = () => {
  const { hrProviders, loading } = useHrProviders();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isIncompleteDialogOpen, setIsIncompleteDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);

  // Count incomplete providers - ONLY those missing LinkedIn ID
  const incompleteCount = hrProviders.filter(provider => 
    !provider.company_linkedin_id
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Chargement des prestataires RH...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Gestion des prestataires RH</h3>
        
        <div className="flex gap-3">
          {incompleteCount > 0 && (
            <Button
              onClick={() => setIsIncompleteDialogOpen(true)}
              variant="outline"
              className="flex items-center gap-2 border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              <AlertCircle className="h-4 w-4" />
              LinkedIn ID manquant ({incompleteCount})
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

      <div className="bg-white rounded-lg border">
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

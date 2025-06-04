
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, ExternalLink, RefreshCw } from 'lucide-react';
import { useHrProviders } from '@/hooks/useHrProviders';
import { useLinkedInEnrichment } from '@/hooks/useLinkedInEnrichment';
import { useToast } from '@/hooks/use-toast';

interface HrProvider {
  id: string;
  company_name: string;
  company_linkedin_url: string | null;
  company_linkedin_id: string | null;
}

interface IncompleteHrProvidersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hrProviders: HrProvider[];
}

export function IncompleteHrProvidersDialog({ open, onOpenChange, hrProviders }: IncompleteHrProvidersDialogProps) {
  const { updateHrProvider } = useHrProviders();
  const { enrichEntity, loading: enrichLoading } = useLinkedInEnrichment();
  const { toast } = useToast();
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    company_linkedin_url: '',
    company_linkedin_id: ''
  });

  // Filter providers that are missing LinkedIn ID (critical field)
  const incompleteProviders = hrProviders.filter(provider => 
    !provider.company_linkedin_id
  );

  const handleEdit = (provider: HrProvider) => {
    setEditingProvider(provider.id);
    setEditData({
      company_linkedin_url: provider.company_linkedin_url || '',
      company_linkedin_id: provider.company_linkedin_id || ''
    });
  };

  const handleSave = async (providerId: string) => {
    try {
      await updateHrProvider(providerId, {
        company_linkedin_url: editData.company_linkedin_url || null,
        company_linkedin_id: editData.company_linkedin_id || null
      });
      setEditingProvider(null);
      toast({
        title: "Succès",
        description: "Informations LinkedIn mises à jour.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les informations.",
        variant: "destructive",
      });
    }
  };

  const handleAutoComplete = async (provider: HrProvider) => {
    if (!provider.company_linkedin_url) {
      toast({
        title: "Information",
        description: "URL LinkedIn requise pour l'enrichissement automatique.",
      });
      return;
    }

    const success = await enrichEntity(provider.id, 'hr_provider', provider.company_linkedin_url);
    if (success) {
      // Refresh will happen automatically via the hook
      toast({
        title: "Succès",
        description: "Prestataire RH enrichi avec succès via Unipile.",
      });
    }
  };

  const canAutoComplete = (provider: HrProvider) => {
    return provider.company_linkedin_url && !provider.company_linkedin_id;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Prestataires RH - LinkedIn ID manquant ({incompleteProviders.length})
          </DialogTitle>
        </DialogHeader>

        {incompleteProviders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Tous les prestataires RH ont un LinkedIn ID !
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <strong>Important :</strong> Le LinkedIn ID est essentiel pour filtrer automatiquement les leads provenant de prestataires RH.
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom de l'entreprise</TableHead>
                  <TableHead>URL LinkedIn</TableHead>
                  <TableHead>LinkedIn ID</TableHead>
                  <TableHead className="w-[200px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incompleteProviders.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell className="font-medium">
                      {provider.company_name}
                    </TableCell>
                    <TableCell>
                      {editingProvider === provider.id ? (
                        <Input
                          value={editData.company_linkedin_url}
                          onChange={(e) => setEditData(prev => ({ 
                            ...prev, 
                            company_linkedin_url: e.target.value 
                          }))}
                          placeholder="https://www.linkedin.com/company/..."
                          className="w-full"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          {provider.company_linkedin_url ? (
                            <>
                              <span className="truncate max-w-[200px]">
                                {provider.company_linkedin_url}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(provider.company_linkedin_url!, '_blank')}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              URL manquante
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingProvider === provider.id ? (
                        <Input
                          value={editData.company_linkedin_id}
                          onChange={(e) => setEditData(prev => ({ 
                            ...prev, 
                            company_linkedin_id: e.target.value 
                          }))}
                          placeholder="LinkedIn ID"
                          className="w-full"
                        />
                      ) : (
                        provider.company_linkedin_id ? (
                          <Badge variant="secondary">
                            {provider.company_linkedin_id}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            ID manquant
                          </Badge>
                        )
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {editingProvider === provider.id ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleSave(provider.id)}
                            >
                              Sauvegarder
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingProvider(null)}
                            >
                              Annuler
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(provider)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {canAutoComplete(provider) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAutoComplete(provider)}
                                disabled={enrichLoading === provider.id}
                                title="Enrichir l'ID LinkedIn via Unipile"
                              >
                                {enrichLoading === provider.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

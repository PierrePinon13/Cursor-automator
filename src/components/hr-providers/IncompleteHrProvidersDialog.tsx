
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, ExternalLink, RefreshCw } from 'lucide-react';
import { useHrProviders } from '@/hooks/useHrProviders';
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
  const { toast } = useToast();
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    company_linkedin_url: '',
    company_linkedin_id: ''
  });
  const [loadingAuto, setLoadingAuto] = useState<string | null>(null);

  // Filter providers that are missing LinkedIn URL or ID
  const incompleteProviders = hrProviders.filter(provider => 
    !provider.company_linkedin_url || !provider.company_linkedin_id
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
    setLoadingAuto(provider.id);
    try {
      // Placeholder for Unipile API call
      toast({
        title: "Information",
        description: "Fonction de complétion automatique via Unipile en développement.",
      });
      
      // TODO: Implement Unipile API call
      // const { data, error } = await supabase.functions.invoke('linkedin-company-info', {
      //   body: { 
      //     company_url: provider.company_linkedin_url,
      //     company_id: provider.company_linkedin_id 
      //   }
      // });
      
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de compléter automatiquement les informations.",
        variant: "destructive",
      });
    } finally {
      setLoadingAuto(null);
    }
  };

  const canAutoComplete = (provider: HrProvider) => {
    return provider.company_linkedin_url || provider.company_linkedin_id;
  };

  const getMissingInfo = (provider: HrProvider) => {
    const missing = [];
    if (!provider.company_linkedin_url) missing.push('URL');
    if (!provider.company_linkedin_id) missing.push('ID');
    return missing;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Prestataires RH incomplets ({incompleteProviders.length})
          </DialogTitle>
        </DialogHeader>

        {incompleteProviders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Tous les prestataires RH ont des informations LinkedIn complètes !
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom de l'entreprise</TableHead>
                <TableHead>Informations manquantes</TableHead>
                <TableHead>URL LinkedIn</TableHead>
                <TableHead>ID LinkedIn</TableHead>
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
                    <div className="flex gap-1">
                      {getMissingInfo(provider).map((info) => (
                        <Badge key={info} variant="destructive" className="text-xs">
                          {info}
                        </Badge>
                      ))}
                    </div>
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
                          <span className="text-gray-400">-</span>
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
                        placeholder="ID LinkedIn"
                        className="w-full"
                      />
                    ) : (
                      provider.company_linkedin_id ? (
                        <Badge variant="secondary">
                          {provider.company_linkedin_id}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
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
                              disabled={loadingAuto === provider.id}
                            >
                              {loadingAuto === provider.id ? (
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
        )}
      </DialogContent>
    </Dialog>
  );
}

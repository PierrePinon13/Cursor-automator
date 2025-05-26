
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, ExternalLink, RefreshCw } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { useToast } from '@/hooks/use-toast';

interface Client {
  id: string;
  company_name: string;
  company_linkedin_url: string | null;
  company_linkedin_id: string | null;
}

interface IncompleteClientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
}

export function IncompleteClientsDialog({ open, onOpenChange, clients }: IncompleteClientsDialogProps) {
  const { updateClient } = useClients();
  const { toast } = useToast();
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    company_linkedin_url: '',
    company_linkedin_id: ''
  });
  const [loadingAuto, setLoadingAuto] = useState<string | null>(null);

  // Filter clients that are missing LinkedIn URL or ID
  const incompleteClients = clients.filter(client => 
    !client.company_linkedin_url || !client.company_linkedin_id
  );

  const handleEdit = (client: Client) => {
    setEditingClient(client.id);
    setEditData({
      company_linkedin_url: client.company_linkedin_url || '',
      company_linkedin_id: client.company_linkedin_id || ''
    });
  };

  const handleSave = async (clientId: string) => {
    try {
      await updateClient(clientId, {
        company_linkedin_url: editData.company_linkedin_url || null,
        company_linkedin_id: editData.company_linkedin_id || null
      });
      setEditingClient(null);
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

  const handleAutoComplete = async (client: Client) => {
    setLoadingAuto(client.id);
    try {
      // Placeholder for Unipile API call
      // This would call an edge function to retrieve missing LinkedIn data
      toast({
        title: "Information",
        description: "Fonction de complétion automatique via Unipile en développement.",
      });
      
      // TODO: Implement Unipile API call
      // const { data, error } = await supabase.functions.invoke('linkedin-company-info', {
      //   body: { 
      //     company_url: client.company_linkedin_url,
      //     company_id: client.company_linkedin_id 
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

  const canAutoComplete = (client: Client) => {
    return client.company_linkedin_url || client.company_linkedin_id;
  };

  const getMissingInfo = (client: Client) => {
    const missing = [];
    if (!client.company_linkedin_url) missing.push('URL');
    if (!client.company_linkedin_id) missing.push('ID');
    return missing;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Comptes incomplets ({incompleteClients.length})
          </DialogTitle>
        </DialogHeader>

        {incompleteClients.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Tous les clients ont des informations LinkedIn complètes !
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
              {incompleteClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    {client.company_name}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {getMissingInfo(client).map((info) => (
                        <Badge key={info} variant="destructive" className="text-xs">
                          {info}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {editingClient === client.id ? (
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
                        {client.company_linkedin_url ? (
                          <>
                            <span className="truncate max-w-[200px]">
                              {client.company_linkedin_url}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(client.company_linkedin_url!, '_blank')}
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
                    {editingClient === client.id ? (
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
                      client.company_linkedin_id ? (
                        <Badge variant="secondary">
                          {client.company_linkedin_id}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {editingClient === client.id ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleSave(client.id)}
                          >
                            Sauvegarder
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingClient(null)}
                          >
                            Annuler
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(client)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {canAutoComplete(client) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAutoComplete(client)}
                              disabled={loadingAuto === client.id}
                            >
                              {loadingAuto === client.id ? (
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

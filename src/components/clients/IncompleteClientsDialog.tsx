
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, ExternalLink, RefreshCw } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { useLinkedInEnrichment } from '@/hooks/useLinkedInEnrichment';
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
  const { enrichEntity, loading: enrichLoading } = useLinkedInEnrichment();
  const { toast } = useToast();
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    company_linkedin_url: '',
    company_linkedin_id: ''
  });

  // Filter clients that are missing LinkedIn ID (critical field)
  const incompleteClients = clients.filter(client => 
    !client.company_linkedin_id
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
    if (!client.company_linkedin_url) {
      toast({
        title: "Information",
        description: "URL LinkedIn requise pour l'enrichissement automatique.",
      });
      return;
    }

    const success = await enrichEntity(client.id, 'client', client.company_linkedin_url);
    if (success) {
      toast({
        title: "Succès",
        description: "Client enrichi avec succès via Unipile.",
      });
    }
  };

  const canAutoComplete = (client: Client) => {
    return client.company_linkedin_url && !client.company_linkedin_id;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Clients incomplets - LinkedIn ID manquant ({incompleteClients.length})
          </DialogTitle>
        </DialogHeader>

        {incompleteClients.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Tous les clients ont un LinkedIn ID !
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <strong>Important :</strong> Le LinkedIn ID est essentiel pour associer automatiquement les leads aux clients.
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
                {incompleteClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      {client.company_name}
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
                            <Badge variant="destructive" className="text-xs">
                              URL manquante
                            </Badge>
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
                          placeholder="LinkedIn ID"
                          className="w-full"
                        />
                      ) : (
                        client.company_linkedin_id ? (
                          <Badge variant="secondary">
                            {client.company_linkedin_id}
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
                                disabled={enrichLoading === client.id}
                                title="Enrichir l'ID LinkedIn via Unipile"
                              >
                                {enrichLoading === client.id ? (
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

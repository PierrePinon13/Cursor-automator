
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, ExternalLink } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { CollaboratorsSelect } from './CollaboratorsSelect';

interface Client {
  id: string;
  company_name: string;
  company_linkedin_url: string | null;
  company_linkedin_id: string | null;
  collaborators?: {
    id: string;
    email: string;
    full_name: string | null;
  }[];
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

interface ClientsTableProps {
  clients: Client[];
  users: User[];
  onEdit: (client: Client) => void;
}

export function ClientsTable({ clients = [], users = [], onEdit }: ClientsTableProps) {
  const { deleteClient, updateCollaborators } = useClients();

  // Logs de débogage
  console.log('ClientsTable props:', { 
    clients: clients, 
    users: users,
    clientsCount: clients?.length,
    usersCount: users?.length 
  });

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      await deleteClient(id);
    }
  };

  const handleCollaboratorsChange = async (clientId: string, userIds: string[]) => {
    console.log('handleCollaboratorsChange called:', { clientId, userIds });
    
    // Vérifications de sécurité
    if (!clientId || typeof clientId !== 'string') {
      console.error('Invalid clientId:', clientId);
      return;
    }
    
    if (!Array.isArray(userIds)) {
      console.error('Invalid userIds:', userIds);
      return;
    }
    
    await updateCollaborators(clientId, userIds);
  };

  // Vérifications de sécurité strictes
  if (!Array.isArray(clients)) {
    console.error('ClientsTable: clients is not an array:', clients);
    return <div>Erreur: données clients invalides</div>;
  }

  if (!Array.isArray(users)) {
    console.error('ClientsTable: users is not an array:', users);
    return <div>Erreur: données utilisateurs invalides</div>;
  }

  const safeClients = clients.filter(client => client && typeof client === 'object' && client.id);
  const safeUsers = users.filter(user => user && typeof user === 'object' && user.id);

  console.log('After safety filter:', { safeClients: safeClients.length, safeUsers: safeUsers.length });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nom de l'entreprise</TableHead>
          <TableHead>URL LinkedIn</TableHead>
          <TableHead>ID LinkedIn</TableHead>
          <TableHead>Collaborateurs</TableHead>
          <TableHead className="w-[120px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {safeClients.map((client) => {
          // Extraction sécurisée des IDs des collaborateurs avec vérifications strictes
          let collaboratorIds: string[] = [];
          
          try {
            if (client.collaborators && Array.isArray(client.collaborators)) {
              collaboratorIds = client.collaborators
                .filter(c => c && typeof c === 'object' && typeof c.id === 'string' && c.id.length > 0)
                .map(c => c.id);
            }
          } catch (error) {
            console.error('Error extracting collaborator IDs for client:', client.id, error);
            collaboratorIds = [];
          }
          
          console.log('Client collaborators for', client.company_name, ':', {
            collaborators: client.collaborators,
            collaboratorIds: collaboratorIds
          });
          
          return (
            <TableRow key={client.id}>
              <TableCell className="font-medium">
                {client.company_name}
              </TableCell>
              <TableCell>
                {client.company_linkedin_url ? (
                  <div className="flex items-center gap-2">
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
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </TableCell>
              <TableCell>
                {client.company_linkedin_id ? (
                  <Badge variant="secondary">
                    {client.company_linkedin_id}
                  </Badge>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </TableCell>
              <TableCell>
                <CollaboratorsSelect
                  users={safeUsers}
                  selectedUsers={collaboratorIds}
                  onSelectionChange={(userIds) => handleCollaboratorsChange(client.id, userIds)}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(client)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(client.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
        {safeClients.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8 text-gray-500">
              Aucun client trouvé. Ajoutez votre premier client ou importez un fichier CSV.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

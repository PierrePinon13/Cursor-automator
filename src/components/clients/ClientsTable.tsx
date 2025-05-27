
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

  console.log('ClientsTable - Props reçues:', { 
    clients: clients, 
    users: users,
    clientsCount: clients?.length,
    usersCount: users?.length,
    clientsType: typeof clients,
    usersType: typeof users,
    clientsIsArray: Array.isArray(clients),
    usersIsArray: Array.isArray(users)
  });

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      await deleteClient(id);
    }
  };

  const handleCollaboratorsChange = async (clientId: string, userIds: string[]) => {
    console.log('handleCollaboratorsChange appelé:', { clientId, userIds });
    
    // Vérifications de sécurité renforcées
    if (!clientId || typeof clientId !== 'string' || clientId.trim().length === 0) {
      console.error('handleCollaboratorsChange: Invalid clientId:', clientId);
      return;
    }
    
    if (!Array.isArray(userIds)) {
      console.error('handleCollaboratorsChange: userIds is not an array:', userIds);
      return;
    }

    // Vérifier que tous les userIds sont des strings valides
    const validUserIds = userIds.filter(id => typeof id === 'string' && id.trim().length > 0);
    if (validUserIds.length !== userIds.length) {
      console.warn('handleCollaboratorsChange: Some invalid userIds filtered out:', {
        original: userIds,
        filtered: validUserIds
      });
    }
    
    try {
      await updateCollaborators(clientId, validUserIds);
    } catch (error) {
      console.error('handleCollaboratorsChange: Error updating collaborators:', error);
    }
  };

  // Vérifications de sécurité strictes avec valeurs par défaut
  const safeClients = Array.isArray(clients) ? clients : [];
  const safeUsers = Array.isArray(users) ? users : [];

  console.log('ClientsTable - Données sécurisées:', {
    safeClients: safeClients.length,
    safeUsers: safeUsers.length
  });

  const validClients = safeClients.filter(client => {
    const isValid = client && 
                   typeof client === 'object' && 
                   typeof client.id === 'string' && 
                   client.id.length > 0 &&
                   typeof client.company_name === 'string';
    if (!isValid) {
      console.warn('ClientsTable: Invalid client filtered out:', client);
    }
    return isValid;
  });

  const validUsers = safeUsers.filter(user => {
    const isValid = user && 
                   typeof user === 'object' && 
                   typeof user.id === 'string' && 
                   user.id.length > 0 &&
                   typeof user.email === 'string' &&
                   user.email.length > 0;
    if (!isValid) {
      console.warn('ClientsTable: Invalid user filtered out:', user);
    }
    return isValid;
  });

  console.log('ClientsTable - Après validation:', { 
    validClients: validClients.length, 
    validUsers: validUsers.length 
  });

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
        {validClients.map((client) => {
          // Extraction sécurisée des IDs des collaborateurs
          let collaboratorIds = [];
          
          try {
            if (client.collaborators && Array.isArray(client.collaborators)) {
              collaboratorIds = client.collaborators
                .filter(c => c && typeof c === 'object' && typeof c.id === 'string' && c.id.length > 0)
                .map(c => c.id);
            }
          } catch (error) {
            console.error('ClientsTable: Error extracting collaborator IDs for client:', client.id, error);
            collaboratorIds = [];
          }
          
          console.log(`ClientsTable - Collaborateurs pour ${client.company_name}:`, {
            collaborators: client.collaborators,
            collaboratorIds: collaboratorIds,
            validUsers: validUsers.length
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
                {/* Vérification supplémentaire avant de passer les props */}
                {Array.isArray(validUsers) && Array.isArray(collaboratorIds) ? (
                  <CollaboratorsSelect
                    users={validUsers}
                    selectedUsers={collaboratorIds}
                    onSelectionChange={(userIds) => handleCollaboratorsChange(client.id, userIds)}
                  />
                ) : (
                  <div className="text-sm text-red-500">
                    Erreur: données invalides pour les collaborateurs
                  </div>
                )}
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
        {validClients.length === 0 && (
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

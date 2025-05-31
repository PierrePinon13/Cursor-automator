
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Edit, Trash2, ExternalLink } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { CollaboratorsSelect } from './CollaboratorsSelect';

interface Client {
  id: string;
  company_name: string;
  company_linkedin_url: string | null;
  company_linkedin_id: string | null;
  tier: string | null;
  tracking_enabled: boolean;
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
  const { deleteClient, updateClient, updateCollaborators, collaboratorsLoading } = useClients();

  console.log('ClientsTable - Données reçues:', { 
    clientsCount: clients?.length,
    usersCount: users?.length,
    users: users
  });

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      await deleteClient(id);
    }
  };

  const handleCollaboratorsChange = async (clientId: string, userIds: string[]) => {
    console.log('Mise à jour des collaborateurs:', { clientId, userIds });
    
    if (!clientId || !Array.isArray(userIds)) {
      console.error('Données invalides pour la mise à jour des collaborateurs');
      return;
    }
    
    try {
      await updateCollaborators(clientId, userIds);
    } catch (error) {
      console.error('Erreur lors de la mise à jour des collaborateurs:', error);
    }
  };

  const handleTrackingToggle = async (clientId: string, trackingEnabled: boolean) => {
    try {
      await updateClient(clientId, { tracking_enabled: trackingEnabled });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du suivi:', error);
    }
  };

  // Validation des données
  const validClients = Array.isArray(clients) ? clients.filter(client => 
    client && client.id && client.company_name
  ) : [];

  const validUsers = Array.isArray(users) ? users.filter(user => 
    user && user.id && (user.email || user.full_name)
  ) : [];

  console.log('ClientsTable - Données validées:', { 
    validClientsCount: validClients.length,
    validUsersCount: validUsers.length,
    validUsers: validUsers
  });

  const getTierBadgeVariant = (tier: string | null) => {
    switch (tier) {
      case 'Tier 1':
        return 'default';
      case 'Tier 2':
        return 'secondary';
      case 'Tier 3':
        return 'outline';
      default:
        return 'destructive';
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nom de l'entreprise</TableHead>
          <TableHead>Tier</TableHead>
          <TableHead>Suivi</TableHead>
          <TableHead>URL LinkedIn</TableHead>
          <TableHead>ID LinkedIn</TableHead>
          <TableHead>Collaborateurs</TableHead>
          <TableHead className="w-[120px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {validClients.map((client) => {
          // Extraire les IDs des collaborateurs de manière sécurisée
          const collaboratorIds = Array.isArray(client.collaborators) 
            ? client.collaborators
                .filter(c => c && c.id)
                .map(c => c.id)
            : [];
          
          console.log(`Collaborateurs pour ${client.company_name}:`, {
            collaborators: client.collaborators,
            collaboratorIds: collaboratorIds
          });
          
          const isCollaboratorsLoading = collaboratorsLoading.has(client.id);
          
          return (
            <TableRow key={client.id}>
              <TableCell className="font-medium">
                {client.company_name}
              </TableCell>
              <TableCell>
                {client.tier ? (
                  <Badge variant={getTierBadgeVariant(client.tier)}>
                    {client.tier}
                  </Badge>
                ) : (
                  <Badge variant="destructive">Non qualifié</Badge>
                )}
              </TableCell>
              <TableCell>
                <Switch
                  checked={client.tracking_enabled}
                  onCheckedChange={(checked) => handleTrackingToggle(client.id, checked)}
                />
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
                  users={validUsers}
                  selectedUsers={collaboratorIds}
                  onSelectionChange={(userIds) => handleCollaboratorsChange(client.id, userIds)}
                  isLoading={isCollaboratorsLoading}
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
        {validClients.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-gray-500">
              Aucun client trouvé. Ajoutez votre premier client ou importez un fichier CSV.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

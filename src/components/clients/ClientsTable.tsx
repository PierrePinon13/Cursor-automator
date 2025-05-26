
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

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      await deleteClient(id);
    }
  };

  const handleCollaboratorsChange = async (clientId: string, userIds: string[]) => {
    await updateCollaborators(clientId, userIds);
  };

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
        {clients.map((client) => {
          const collaboratorIds = client.collaborators?.map(c => c.id) || [];
          
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
                  users={users}
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
        {clients.length === 0 && (
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

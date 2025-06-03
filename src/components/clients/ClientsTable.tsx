
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Edit, Trash2, Plus, User } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { useClientContacts } from '@/hooks/useClientContacts';
import { CollaboratorsSelect } from './CollaboratorsSelect';
import { TierSelector } from './TierSelector';
import { LinkedInIcon } from './LinkedInIcon';
import { ContactDialog } from './ContactDialog';

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
  const { deleteClient, updateClient } = useClients();
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      await deleteClient(id);
    }
  };

  const handleTrackingToggle = async (clientId: string, trackingEnabled: boolean) => {
    try {
      await updateClient(clientId, { tracking_enabled: trackingEnabled });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du suivi:', error);
    }
  };

  const handleTierChange = async (clientId: string, tier: string | null) => {
    try {
      await updateClient(clientId, { tier });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du tier:', error);
    }
  };

  const handleAddContact = (clientId: string) => {
    setSelectedClientId(clientId);
    setShowContactDialog(true);
  };

  // Validation des données
  const validClients = Array.isArray(clients) ? clients.filter(client => 
    client && client.id && client.company_name
  ) : [];

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Collaborateurs</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Suivi</TableHead>
            <TableHead>Contacts</TableHead>
            <TableHead className="w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {validClients.map((client) => {
            return (
              <TableRow key={client.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span>{client.company_name}</span>
                    <LinkedInIcon url={client.company_linkedin_url} />
                  </div>
                </TableCell>
                <TableCell>
                  <CollaboratorsSelect clientId={client.id} />
                </TableCell>
                <TableCell>
                  <TierSelector
                    value={client.tier}
                    onChange={(tier) => handleTierChange(client.id, tier)}
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={client.tracking_enabled}
                    onCheckedChange={(checked) => handleTrackingToggle(client.id, checked)}
                  />
                </TableCell>
                <TableCell>
                  <ContactsCell 
                    clientId={client.id} 
                    onAddContact={() => handleAddContact(client.id)}
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
                      className="text-red-600 hover:text-red-800"
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
              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                Aucun client trouvé. Ajoutez votre premier client ou importez un fichier CSV.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {selectedClientId && (
        <ContactDialog
          open={showContactDialog}
          onOpenChange={(open) => {
            setShowContactDialog(open);
            if (!open) setSelectedClientId(null);
          }}
          clientId={selectedClientId}
        />
      )}
    </>
  );
}

// Composant pour afficher les contacts d'un client
function ContactsCell({ clientId, onAddContact }: { clientId: string; onAddContact: () => void }) {
  const { contacts, loading } = useClientContacts(clientId);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Chargement...</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onAddContact}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 max-w-xs">
      {contacts.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {contacts.slice(0, 2).map((contact) => (
            <span
              key={contact.id}
              className="inline-flex items-center gap-1 text-xs bg-gray-100 rounded px-2 py-1"
            >
              <User className="h-3 w-3" />
              {contact.first_name} {contact.last_name}
            </span>
          ))}
          {contacts.length > 2 && (
            <span className="text-xs text-gray-500">
              +{contacts.length - 2} autres
            </span>
          )}
        </div>
      ) : (
        <span className="text-sm text-gray-400">Aucun contact</span>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 flex-shrink-0"
        onClick={onAddContact}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}

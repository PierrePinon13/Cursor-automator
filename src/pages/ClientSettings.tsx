
import { useState } from 'react';
import { useClients } from '@/hooks/useClients';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, Upload, AlertCircle, ArrowLeft, Edit, Trash2, User, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ClientDialog } from '@/components/clients/ClientDialog';
import { ImportClientsDialog } from '@/components/clients/ImportClientsDialog';
import { IncompleteClientsDialog } from '@/components/clients/IncompleteClientsDialog';
import { ContactDialog } from '@/components/clients/ContactDialog';
import { LinkedInIcon } from '@/components/clients/LinkedInIcon';
import { TierSelector } from '@/components/clients/TierSelector';
import { CollaboratorsSelect } from '@/components/clients/CollaboratorsSelect';
import { useClientContacts } from '@/hooks/useClientContacts';

const ClientSettings = () => {
  const navigate = useNavigate();
  const { clients, users, loading, updateClient, deleteClient } = useClients();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isIncompleteDialogOpen, setIsIncompleteDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<any>(null);

  // Count incomplete clients
  const incompleteCount = clients.filter(client => 
    !client.company_linkedin_url || !client.company_linkedin_id
  ).length;

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

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      await deleteClient(id);
    }
  };

  const handleAddContact = (clientId: string) => {
    setSelectedClientId(clientId);
    setEditingContact(null);
    setShowContactDialog(true);
  };

  const handleEditContact = (clientId: string, contact: any) => {
    setSelectedClientId(clientId);
    setEditingContact(contact);
    setShowContactDialog(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Chargement des clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <Button
            variant="ghost"
            onClick={() => navigate('/clients')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux clients
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres clients</h1>
        </div>
        
        <div className="flex gap-3">
          {incompleteCount > 0 && (
            <Button
              onClick={() => setIsIncompleteDialogOpen(true)}
              variant="outline"
              className="flex items-center gap-2 border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              <AlertCircle className="h-4 w-4" />
              Comptes incomplets ({incompleteCount})
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
            Nouveau client
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entreprise
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Collaborateurs
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Suivi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.map((client) => (
                <TableRow
                  key={client.id}
                  client={client}
                  onEdit={setEditingClient}
                  onDelete={handleDelete}
                  onTrackingToggle={handleTrackingToggle}
                  onTierChange={handleTierChange}
                  onAddContact={handleAddContact}
                  onEditContact={handleEditContact}
                />
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Aucun client trouvé. Ajoutez votre premier client ou importez un fichier CSV.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ClientDialog
        open={isCreateDialogOpen || !!editingClient}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingClient(null);
          }
        }}
        client={editingClient}
        users={users}
      />

      <ImportClientsDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
      />

      <IncompleteClientsDialog
        open={isIncompleteDialogOpen}
        onOpenChange={setIsIncompleteDialogOpen}
        clients={clients}
      />

      {selectedClientId && (
        <ContactDialog
          open={showContactDialog}
          onOpenChange={(open) => {
            setShowContactDialog(open);
            if (!open) {
              setSelectedClientId(null);
              setEditingContact(null);
            }
          }}
          clientId={selectedClientId}
          contact={editingContact}
        />
      )}
    </div>
  );
};

// Composant pour chaque ligne du tableau
function TableRow({ client, onEdit, onDelete, onTrackingToggle, onTierChange, onAddContact, onEditContact }: {
  client: any;
  onEdit: (client: any) => void;
  onDelete: (id: string) => void;
  onTrackingToggle: (clientId: string, trackingEnabled: boolean) => void;
  onTierChange: (clientId: string, tier: string | null) => void;
  onAddContact: (clientId: string) => void;
  onEditContact: (clientId: string, contact: any) => void;
}) {
  const { contacts, loading } = useClientContacts(client.id);

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center justify-between min-w-0 pr-2">
          <span className="text-sm font-medium text-gray-900 truncate flex-1 mr-2">
            {client.company_name}
          </span>
          <div className="flex-shrink-0">
            <LinkedInIcon url={client.company_linkedin_url} />
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <CollaboratorsSelect clientId={client.id} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <TierSelector
          value={client.tier}
          onChange={(tier) => onTierChange(client.id, tier)}
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Switch
          checked={client.tracking_enabled}
          onCheckedChange={(checked) => onTrackingToggle(client.id, checked)}
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <ContactsCell 
          clientId={client.id} 
          contacts={contacts}
          loading={loading}
          onAddContact={() => onAddContact(client.id)}
          onEditContact={(contact) => onEditContact(client.id, contact)}
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(client)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(client.id)}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// Composant pour afficher les contacts d'un client
function ContactsCell({ clientId, contacts, loading, onAddContact, onEditContact }: { 
  clientId: string; 
  contacts: any[];
  loading: boolean;
  onAddContact: () => void;
  onEditContact: (contact: any) => void;
}) {
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
            <div
              key={contact.id}
              className="inline-flex items-center gap-1 text-xs bg-gray-100 rounded px-2 py-1 group"
            >
              <User className="h-3 w-3" />
              <span>{contact.first_name} {contact.last_name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onEditContact(contact)}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            </div>
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

export default ClientSettings;

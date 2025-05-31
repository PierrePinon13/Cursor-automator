
import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Edit, Trash2 } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { CollaboratorsSelect } from './CollaboratorsSelect';
import { TierSelector } from './TierSelector';
import { LinkedInIcon } from './LinkedInIcon';

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

interface ResizableTableProps {
  clients: Client[];
  users: User[];
  onEdit: (client: Client) => void;
  searchTerm: string;
}

export function ResizableTable({ clients = [], users = [], onEdit, searchTerm }: ResizableTableProps) {
  const { deleteClient, updateClient, updateCollaborators, collaboratorsLoading } = useClients();
  
  const [columnWidths, setColumnWidths] = useState({
    name: 200,
    collaborators: 250,
    tier: 120,
    tracking: 80,
    linkedin: 80,
    actions: 120
  });

  const [resizing, setResizing] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const [localTrackingStates, setLocalTrackingStates] = useState<Record<string, boolean>>({});

  // Initialiser les états locaux
  useEffect(() => {
    const trackingStates: Record<string, boolean> = {};
    clients.forEach(client => {
      trackingStates[client.id] = client.tracking_enabled;
    });
    setLocalTrackingStates(trackingStates);
  }, [clients]);

  const handleMouseDown = (e: React.MouseEvent, column: string) => {
    setResizing(column);
    setStartX(e.clientX);
    setStartWidth(columnWidths[column as keyof typeof columnWidths]);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizing) return;
    
    const diff = e.clientX - startX;
    const newWidth = Math.max(80, startWidth + diff);
    
    setColumnWidths(prev => ({
      ...prev,
      [resizing]: newWidth
    }));
  };

  const handleMouseUp = () => {
    setResizing(null);
  };

  React.useEffect(() => {
    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [resizing, startX, startWidth]);

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      await deleteClient(id);
    }
  };

  const handleCollaboratorsChange = async (clientId: string, userIds: string[]) => {
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
    // Mise à jour immédiate de l'état local
    setLocalTrackingStates(prev => ({
      ...prev,
      [clientId]: trackingEnabled
    }));

    try {
      await updateClient(clientId, { tracking_enabled: trackingEnabled });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du suivi:', error);
      // Revenir à l'ancien état en cas d'erreur
      setLocalTrackingStates(prev => ({
        ...prev,
        [clientId]: !trackingEnabled
      }));
    }
  };

  const handleTierChange = async (clientId: string, tier: string | null) => {
    try {
      await updateClient(clientId, { tier });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du tier:', error);
    }
  };

  // Filtrage des clients selon le terme de recherche
  const filteredClients = clients.filter(client => 
    client.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const validClients = Array.isArray(filteredClients) ? filteredClients.filter(client => 
    client && client.id && client.company_name
  ) : [];

  const validUsers = Array.isArray(users) ? users.filter(user => 
    user && user.id && (user.email || user.full_name)
  ) : [];

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              style={{ width: columnWidths.name, minWidth: 120, position: 'relative' }}
              className="select-none"
            >
              Nom
              <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100"
                onMouseDown={(e) => handleMouseDown(e, 'name')}
              />
            </TableHead>
            <TableHead 
              style={{ width: columnWidths.collaborators, minWidth: 150, position: 'relative' }}
              className="select-none"
            >
              Collaborateurs
              <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100"
                onMouseDown={(e) => handleMouseDown(e, 'collaborators')}
              />
            </TableHead>
            <TableHead 
              style={{ width: columnWidths.tier, minWidth: 100, position: 'relative' }}
              className="select-none"
            >
              Tier
              <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100"
                onMouseDown={(e) => handleMouseDown(e, 'tier')}
              />
            </TableHead>
            <TableHead 
              style={{ width: columnWidths.tracking, minWidth: 70, position: 'relative' }}
              className="select-none"
            >
              Suivi
              <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100"
                onMouseDown={(e) => handleMouseDown(e, 'tracking')}
              />
            </TableHead>
            <TableHead 
              style={{ width: columnWidths.linkedin, minWidth: 70, position: 'relative' }}
              className="select-none"
            >
              LinkedIn
              <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100"
                onMouseDown={(e) => handleMouseDown(e, 'linkedin')}
              />
            </TableHead>
            <TableHead style={{ width: columnWidths.actions, minWidth: 120 }}>
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {validClients.map((client) => {
            const collaboratorIds = Array.isArray(client.collaborators) 
              ? client.collaborators
                  .filter(c => c && c.id)
                  .map(c => c.id)
              : [];
            
            const isCollaboratorsLoading = collaboratorsLoading.has(client.id);
            const localTrackingState = localTrackingStates[client.id] ?? client.tracking_enabled;
            
            return (
              <TableRow key={client.id}>
                <TableCell 
                  className="font-medium"
                  style={{ width: columnWidths.name }}
                >
                  {client.company_name}
                </TableCell>
                <TableCell style={{ width: columnWidths.collaborators }}>
                  <CollaboratorsSelect
                    users={validUsers}
                    selectedUsers={collaboratorIds}
                    onSelectionChange={(userIds) => handleCollaboratorsChange(client.id, userIds)}
                    isLoading={isCollaboratorsLoading}
                  />
                </TableCell>
                <TableCell style={{ width: columnWidths.tier }}>
                  <TierSelector
                    value={client.tier}
                    onChange={(tier) => handleTierChange(client.id, tier)}
                  />
                </TableCell>
                <TableCell style={{ width: columnWidths.tracking }}>
                  <Switch
                    checked={localTrackingState}
                    onCheckedChange={(checked) => handleTrackingToggle(client.id, checked)}
                  />
                </TableCell>
                <TableCell style={{ width: columnWidths.linkedin }}>
                  <LinkedInIcon url={client.company_linkedin_url} />
                </TableCell>
                <TableCell style={{ width: columnWidths.actions }}>
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
              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                {searchTerm ? 'Aucun client trouvé pour cette recherche.' : 'Aucun client trouvé. Ajoutez votre premier client ou importez un fichier CSV.'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

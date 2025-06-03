
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Edit2, 
  ExternalLink, 
  Users,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { ContactsList } from './ContactsList';

interface Client {
  id: string;
  company_name: string;
  company_linkedin_url: string | null;
  company_linkedin_id: string | null;
  tier: string | null;
  tracking_enabled: boolean;
  created_at: string;
  updated_at: string;
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

export function ResizableTable({ clients, users, onEdit, searchTerm }: ResizableTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filter clients based on search term
  const filteredClients = clients.filter(client =>
    client.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleRow = (clientId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedRows(newExpanded);
  };

  const getTierColor = (tier: string | null) => {
    switch (tier) {
      case 'A': return 'bg-green-100 text-green-800 border-green-200';
      case 'B': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'C': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Entreprise</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Suivi actif</TableHead>
            <TableHead>LinkedIn</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredClients.map((client) => (
            <>
              {/* Main row */}
              <TableRow key={client.id} className="hover:bg-gray-50">
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleRow(client.id)}
                    className="h-6 w-6 p-0"
                  >
                    {expandedRows.has(client.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                
                <TableCell className="font-medium">
                  {client.company_name}
                </TableCell>
                
                <TableCell>
                  {client.tier && (
                    <Badge variant="outline" className={getTierColor(client.tier)}>
                      Tier {client.tier}
                    </Badge>
                  )}
                </TableCell>
                
                <TableCell>
                  <Badge variant={client.tracking_enabled ? "default" : "secondary"}>
                    {client.tracking_enabled ? 'Actif' : 'Inactif'}
                  </Badge>
                </TableCell>
                
                <TableCell>
                  {client.company_linkedin_url && (
                    <a
                      href={client.company_linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </TableCell>
                
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(client)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleRow(client.id)}
                      className="h-8 w-8 p-0"
                      title="Voir les contacts"
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>

              {/* Expanded row for contacts */}
              {expandedRows.has(client.id) && (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <div className="bg-gray-50 p-6 border-t">
                      <ContactsList 
                        clientId={client.id} 
                        clientName={client.company_name}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>

      {filteredClients.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm ? 'Aucun client trouvé pour cette recherche.' : 'Aucun client trouvé.'}
        </div>
      )}
    </div>
  );
}

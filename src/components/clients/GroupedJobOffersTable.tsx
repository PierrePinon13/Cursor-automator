
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, Archive, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ClientJobOffer, User as UserType } from '@/hooks/useClientJobOffers';

interface GroupedJobOffersTableProps {
  jobOffers: ClientJobOffer[];
  users: UserType[];
  onAssignJobOffer: (jobOfferId: string, userId: string | null) => void;
  onUpdateStatus: (jobOfferId: string, status: string) => void;
  animatingItems: Set<string>;
}

export function GroupedJobOffersTable({ 
  jobOffers, 
  users, 
  onAssignJobOffer, 
  onUpdateStatus,
  animatingItems 
}: GroupedJobOffersTableProps) {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ClientJobOffer;
    direction: 'asc' | 'desc';
  } | null>(null);

  const handleSort = (key: keyof ClientJobOffer) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
  };

  const sortedJobOffers = [...jobOffers].sort((a, b) => {
    if (!sortConfig) return 0;

    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const getAssignedUser = (userId: string | null) => {
    if (!userId) return null;
    return users.find(user => user.id === userId);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'non_attribuee': return 'Non attribuée';
      case 'en_attente': return 'En attente';
      case 'a_relancer': return 'À relancer';
      case 'negatif': return 'Négatif';
      case 'positif': return 'Positif';
      case 'archivee': return 'Archivée';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'non_attribuee': return 'bg-gray-100 text-gray-800';
      case 'en_attente': return 'bg-blue-100 text-blue-800';
      case 'a_relancer': return 'bg-orange-100 text-orange-800';
      case 'negatif': return 'bg-red-100 text-red-800';
      case 'positif': return 'bg-green-100 text-green-800';
      case 'archivee': return 'bg-gray-200 text-gray-600';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (sortedJobOffers.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center text-gray-500">
          <div className="mb-2">👁️</div>
          <div>Aucune offre d'emploi trouvée</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-medium">Entreprise</TableHead>
            <TableHead className="font-medium">Titre du poste</TableHead>
            <TableHead className="font-medium">Publication</TableHead>
            <TableHead className="font-medium">Localisation</TableHead>
            <TableHead className="font-medium">Assignation</TableHead>
            <TableHead className="font-medium">Statut</TableHead>
            <TableHead className="font-medium">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedJobOffers.map((offer) => (
            <TableRow key={offer.id} className="hover:bg-gray-50">
              <TableCell className="font-medium">
                {offer.company_name || 'N/A'}
              </TableCell>
              
              <TableCell>
                <a 
                  href={offer.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                >
                  {offer.title || 'Titre non disponible'}
                </a>
              </TableCell>
              
              <TableCell>
                {offer.posted_at ? (
                  format(new Date(offer.posted_at), 'dd/MM/yyyy', { locale: fr })
                ) : (
                  format(new Date(offer.created_at), 'dd/MM/yyyy', { locale: fr })
                )}
              </TableCell>
              
              <TableCell>
                {offer.location || 'N/A'}
              </TableCell>
              
              <TableCell>
                <Select
                  value={offer.assigned_to_user_id || "unassigned"}
                  onValueChange={(value) => 
                    onAssignJobOffer(offer.id, value === "unassigned" ? null : value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {offer.assigned_to_user_id ? (
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          <span className="text-sm">
                            {getAssignedUser(offer.assigned_to_user_id)?.full_name || 
                             getAssignedUser(offer.assigned_to_user_id)?.email || 
                             'Utilisateur inconnu'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">Non assigné</span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">
                      <span className="text-gray-500">Non assigné</span>
                    </SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          {user.full_name || user.email}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              
              <TableCell>
                <Select
                  value={offer.status}
                  onValueChange={(value) => onUpdateStatus(offer.id, value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      <span className={`px-2 py-1 rounded-full text-sm ${getStatusColor(offer.status)}`}>
                        {getStatusLabel(offer.status)}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non_attribuee">Non attribuée</SelectItem>
                    <SelectItem value="en_attente">En attente</SelectItem>
                    <SelectItem value="a_relancer">À relancer</SelectItem>
                    <SelectItem value="negatif">Négatif</SelectItem>
                    <SelectItem value="positif">Positif</SelectItem>
                    <SelectItem value="archivee">Archivée</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              
              <TableCell>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onUpdateStatus(offer.id, 'archivee')}
                  title="Archiver cette offre"
                >
                  <Archive className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}


import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, Calendar, MapPin, DollarSign, Building, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ClientJobOffer, User as UserType } from '@/hooks/useClientJobOffers';

interface JobOffersTableProps {
  jobOffers: ClientJobOffer[];
  users: UserType[];
  onAssignJobOffer: (jobOfferId: string, userId: string | null) => void;
}

export function JobOffersTable({ jobOffers, users, onAssignJobOffer }: JobOffersTableProps) {
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

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-[300px]">
              <Button 
                variant="ghost" 
                onClick={() => handleSort('title')}
                className="h-auto p-0 font-medium"
              >
                Titre du poste
              </Button>
            </TableHead>
            <TableHead className="w-[200px]">
              <Button 
                variant="ghost" 
                onClick={() => handleSort('company_name')}
                className="h-auto p-0 font-medium"
              >
                Entreprise
              </Button>
            </TableHead>
            <TableHead className="w-[150px]">
              <Button 
                variant="ghost" 
                onClick={() => handleSort('location')}
                className="h-auto p-0 font-medium"
              >
                Localisation
              </Button>
            </TableHead>
            <TableHead className="w-[120px]">Type</TableHead>
            <TableHead className="w-[120px]">Salaire</TableHead>
            <TableHead className="w-[150px]">
              <Button 
                variant="ghost" 
                onClick={() => handleSort('posted_at')}
                className="h-auto p-0 font-medium"
              >
                Date de publication
              </Button>
            </TableHead>
            <TableHead className="w-[200px]">Assignation</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedJobOffers.map((offer) => (
            <TableRow key={offer.id} className="hover:bg-gray-50">
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium text-sm line-clamp-2">
                    {offer.title || 'Titre non disponible'}
                  </div>
                  {offer.matched_client_name && (
                    <Badge variant="outline" className="text-xs">
                      <Building className="h-3 w-3 mr-1" />
                      Client: {offer.matched_client_name}
                    </Badge>
                  )}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="text-sm">
                  {offer.company_name || 'Entreprise non renseignée'}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <MapPin className="h-3 w-3" />
                  {offer.location || 'Non spécifié'}
                </div>
              </TableCell>
              
              <TableCell>
                {offer.job_type && (
                  <Badge variant="secondary" className="text-xs">
                    {offer.job_type}
                  </Badge>
                )}
              </TableCell>
              
              <TableCell>
                {offer.salary && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <DollarSign className="h-3 w-3" />
                    {offer.salary}
                  </div>
                )}
              </TableCell>
              
              <TableCell>
                <div className="space-y-1">
                  {offer.posted_at && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(offer.posted_at), 'dd MMM yyyy', { locale: fr })}
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    Ajouté: {format(new Date(offer.created_at), 'dd/MM HH:mm', { locale: fr })}
                  </div>
                </div>
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
                {offer.assigned_at && (
                  <div className="text-xs text-gray-500 mt-1">
                    Assigné: {format(new Date(offer.assigned_at), 'dd/MM HH:mm', { locale: fr })}
                  </div>
                )}
              </TableCell>
              
              <TableCell>
                <Button variant="ghost" size="sm" asChild>
                  <a 
                    href={offer.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </TableCell>
            </TableRow>
          ))}
          
          {sortedJobOffers.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                Aucune offre d'emploi trouvée
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

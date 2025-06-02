
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, Calendar, MapPin, DollarSign, Building, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ClientJobOffer, User as UserType } from '@/hooks/useClientJobOffers';

interface CompactJobOffersTableProps {
  jobOffers: ClientJobOffer[];
  users: UserType[];
  onAssignJobOffer: (jobOfferId: string, userId: string | null) => void;
}

export function CompactJobOffersTable({ jobOffers, users, onAssignJobOffer }: CompactJobOffersTableProps) {
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
    <div className="border rounded-lg overflow-hidden bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 h-10">
            <TableHead className="w-[280px] py-2">
              <Button 
                variant="ghost" 
                onClick={() => handleSort('title')}
                className="h-auto p-0 font-medium text-xs"
              >
                Titre du poste
              </Button>
            </TableHead>
            <TableHead className="w-[160px] py-2">
              <Button 
                variant="ghost" 
                onClick={() => handleSort('company_name')}
                className="h-auto p-0 font-medium text-xs"
              >
                Entreprise
              </Button>
            </TableHead>
            <TableHead className="w-[120px] py-2">
              <Button 
                variant="ghost" 
                onClick={() => handleSort('location')}
                className="h-auto p-0 font-medium text-xs"
              >
                Localisation
              </Button>
            </TableHead>
            <TableHead className="w-[80px] py-2 text-xs font-medium">Type</TableHead>
            <TableHead className="w-[100px] py-2 text-xs font-medium">Salaire</TableHead>
            <TableHead className="w-[120px] py-2">
              <Button 
                variant="ghost" 
                onClick={() => handleSort('posted_at')}
                className="h-auto p-0 font-medium text-xs"
              >
                Publication
              </Button>
            </TableHead>
            <TableHead className="w-[160px] py-2 text-xs font-medium">Assignation</TableHead>
            <TableHead className="w-[60px] py-2 text-xs font-medium">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedJobOffers.map((offer) => (
            <TableRow key={offer.id} className="hover:bg-gray-50 h-12">
              <TableCell className="py-2">
                <div className="space-y-1">
                  <div className="font-medium text-xs line-clamp-1">
                    {offer.title || 'Titre non disponible'}
                  </div>
                  {offer.matched_client_name && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                      <Building className="h-2 w-2 mr-1" />
                      {offer.matched_client_name}
                    </Badge>
                  )}
                </div>
              </TableCell>
              
              <TableCell className="py-2">
                <div className="text-xs truncate">
                  {offer.company_name || 'N/A'}
                </div>
              </TableCell>
              
              <TableCell className="py-2">
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{offer.location || 'N/A'}</span>
                </div>
              </TableCell>
              
              <TableCell className="py-2">
                {offer.job_type && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                    {offer.job_type}
                  </Badge>
                )}
              </TableCell>
              
              <TableCell className="py-2">
                {offer.salary && (
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <DollarSign className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{offer.salary}</span>
                  </div>
                )}
              </TableCell>
              
              <TableCell className="py-2">
                <div className="space-y-1">
                  {offer.posted_at && (
                    <div className="text-xs text-gray-600">
                      {format(new Date(offer.posted_at), 'dd/MM/yy', { locale: fr })}
                    </div>
                  )}
                  <div className="text-[10px] text-gray-400">
                    {format(new Date(offer.created_at), 'dd/MM HH:mm', { locale: fr })}
                  </div>
                </div>
              </TableCell>
              
              <TableCell className="py-2">
                <Select
                  value={offer.assigned_to_user_id || "unassigned"}
                  onValueChange={(value) => 
                    onAssignJobOffer(offer.id, value === "unassigned" ? null : value)
                  }
                >
                  <SelectTrigger className="w-full h-7 text-xs">
                    <SelectValue>
                      {offer.assigned_to_user_id ? (
                        <div className="flex items-center gap-1 truncate">
                          <User className="h-2 w-2 flex-shrink-0" />
                          <span className="truncate">
                            {getAssignedUser(offer.assigned_to_user_id)?.full_name || 
                             getAssignedUser(offer.assigned_to_user_id)?.email || 
                             'Inconnu'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500">Non assigné</span>
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
                  <div className="text-[10px] text-gray-400 mt-1">
                    {format(new Date(offer.assigned_at), 'dd/MM HH:mm', { locale: fr })}
                  </div>
                )}
              </TableCell>
              
              <TableCell className="py-2">
                <Button variant="ghost" size="sm" asChild className="h-6 w-6 p-0">
                  <a 
                    href={offer.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3 w-3" />
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

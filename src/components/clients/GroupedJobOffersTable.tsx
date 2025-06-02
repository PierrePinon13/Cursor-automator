
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, MapPin, User, Archive, Users, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ClientJobOffer, User as UserType } from '@/hooks/useClientJobOffers';
import { Badge } from '@/components/ui/badge';

interface GroupedJobOffersTableProps {
  jobOffers: ClientJobOffer[];
  users: UserType[];
  onAssignJobOffer: (jobOfferId: string, userId: string | null) => void;
  onUpdateStatus: (jobOfferId: string, status: string) => void;
}

export function GroupedJobOffersTable({ jobOffers, users, onAssignJobOffer, onUpdateStatus }: GroupedJobOffersTableProps) {
  const [groupByCompany, setGroupByCompany] = useState(true);
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

  // Grouper par entreprise si l'option est activée
  const groupedOffers = groupByCompany 
    ? sortedJobOffers.reduce((acc, offer) => {
        const companyName = offer.company_name || 'Entreprise non renseignée';
        if (!acc[companyName]) {
          acc[companyName] = [];
        }
        acc[companyName].push(offer);
        return acc;
      }, {} as Record<string, ClientJobOffer[]>)
    : { 'all': sortedJobOffers };

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
      case 'non_attribuee': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'en_attente': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'a_relancer': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'negatif': return 'bg-red-100 text-red-800 border-red-300';
      case 'positif': return 'bg-green-100 text-green-800 border-green-300';
      case 'archivee': return 'bg-gray-200 text-gray-600 border-gray-400';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatLocation = (location: string | null) => {
    if (!location) return 'N/A';
    
    const parts = location.split(',');
    if (parts.length > 1) {
      return parts[0].trim();
    }
    
    if (location.length <= 15) return location;
    return location.substring(0, 12) + '...';
  };

  return (
    <div className="space-y-4">
      {/* Contrôles de regroupement */}
      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-blue-600" />
          <span className="font-medium text-gray-700">Affichage</span>
        </div>
        <Button
          variant={groupByCompany ? "default" : "outline"}
          size="sm"
          onClick={() => setGroupByCompany(!groupByCompany)}
          className={groupByCompany 
            ? "bg-blue-600 text-white" 
            : "border-gray-300 text-gray-700 hover:bg-blue-50"
          }
        >
          {groupByCompany ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
          {groupByCompany ? 'Groupé par entreprise' : 'Vue simple'}
        </Button>
      </div>

      {/* Tableau */}
      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 h-12">
              <TableHead className="font-semibold text-gray-900 w-48">
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('company_name')}
                  className="h-auto p-0 font-semibold hover:text-blue-600"
                >
                  Entreprise
                </Button>
              </TableHead>
              <TableHead className="font-semibold text-gray-900 w-80">
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('title')}
                  className="h-auto p-0 font-semibold hover:text-blue-600"
                >
                  Titre du poste
                </Button>
              </TableHead>
              <TableHead className="font-semibold text-gray-900 w-32">
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('posted_at')}
                  className="h-auto p-0 font-semibold hover:text-blue-600"
                >
                  Publication
                </Button>
              </TableHead>
              <TableHead className="font-semibold text-gray-900 w-28">
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('location')}
                  className="h-auto p-0 font-semibold hover:text-blue-600"
                >
                  Localisation
                </Button>
              </TableHead>
              <TableHead className="font-semibold text-gray-900 w-48">Assignation</TableHead>
              <TableHead className="font-semibold text-gray-900 w-40">Statut</TableHead>
              <TableHead className="font-semibold text-gray-900 w-24">Archiver</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedOffers).map(([companyName, offers]) => 
              offers.map((offer, index) => (
                <TableRow key={offer.id} className="hover:bg-blue-50/50 transition-colors">
                  {/* Entreprise - fusionnée visuellement pour le regroupement */}
                  <TableCell className="py-3">
                    {(groupByCompany && index === 0) || !groupByCompany ? (
                      <div className="font-medium text-gray-900">
                        {companyName}
                        {groupByCompany && offers.length > 1 && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {offers.length} offres
                          </Badge>
                        )}
                      </div>
                    ) : null}
                  </TableCell>

                  {/* Titre du poste */}
                  <TableCell className="py-3">
                    <a 
                      href={offer.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    >
                      {offer.title || 'Titre non disponible'}
                    </a>
                  </TableCell>

                  {/* Date de publication */}
                  <TableCell className="py-3">
                    {offer.posted_at && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(offer.posted_at), 'dd/MM/yy', { locale: fr })}
                      </div>
                    )}
                  </TableCell>

                  {/* Localisation */}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{formatLocation(offer.location)}</span>
                    </div>
                  </TableCell>

                  {/* Assignation avec UX améliorée */}
                  <TableCell className="py-3">
                    <Select
                      value={offer.assigned_to_user_id || "unassigned"}
                      onValueChange={(value) => 
                        onAssignJobOffer(offer.id, value === "unassigned" ? null : value)
                      }
                    >
                      <SelectTrigger className="w-full h-9 bg-white border-gray-200 hover:border-blue-300 focus:border-blue-500 transition-colors">
                        <SelectValue>
                          {offer.assigned_to_user_id ? (
                            <div className="flex items-center gap-2 truncate">
                              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                              <span className="truncate text-sm">
                                {getAssignedUser(offer.assigned_to_user_id)?.full_name || 
                                 getAssignedUser(offer.assigned_to_user_id)?.email || 
                                 'Inconnu'}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-gray-500">
                              <div className="w-2 h-2 bg-gray-300 rounded-full flex-shrink-0"></div>
                              <span className="text-sm">Non assigné</span>
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="unassigned">
                          <div className="flex items-center gap-2 text-gray-500">
                            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                            <span>Non assigné</span>
                          </div>
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
                      <div className="text-xs text-gray-400 mt-1">
                        {format(new Date(offer.assigned_at), 'dd/MM HH:mm', { locale: fr })}
                      </div>
                    )}
                  </TableCell>

                  {/* Statut */}
                  <TableCell className="py-3">
                    <Select
                      value={offer.status}
                      onValueChange={(value) => onUpdateStatus(offer.id, value)}
                    >
                      <SelectTrigger className="w-full h-9 bg-white border-gray-200 hover:border-blue-300 focus:border-blue-500 transition-colors">
                        <SelectValue>
                          <Badge 
                            variant="outline" 
                            className={`text-xs font-medium border ${getStatusColor(offer.status)}`}
                          >
                            {getStatusLabel(offer.status)}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="non_attribuee">Non attribuée</SelectItem>
                        <SelectItem value="en_attente">En attente</SelectItem>
                        <SelectItem value="a_relancer">À relancer</SelectItem>
                        <SelectItem value="negatif">Négatif</SelectItem>
                        <SelectItem value="positif">Positif</SelectItem>
                        <SelectItem value="archivee">Archivée</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Action Archiver */}
                  <TableCell className="py-3">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 transition-colors"
                      onClick={() => onUpdateStatus(offer.id, 'archivee')}
                      title="Archiver cette offre"
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
            
            {jobOffers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-8 w-8 text-gray-300" />
                    <span>Aucune offre d'emploi trouvée</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

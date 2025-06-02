
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, MapPin, User, Archive, Eye, EyeOff, UserPlus, Check, ChevronDown, ArchiveX, ArchiveRestore } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ClientJobOffer, User as UserType } from '@/hooks/useClientJobOffers';
import { Badge } from '@/components/ui/badge';

interface GroupedJobOffersTableProps {
  jobOffers: ClientJobOffer[];
  users: UserType[];
  onAssignJobOffer: (jobOfferId: string, userId: string | null) => void;
  onUpdateStatus: (jobOfferId: string, status: string) => void;
  animatingItems?: Set<string>;
}

export function GroupedJobOffersTable({ 
  jobOffers, 
  users, 
  onAssignJobOffer, 
  onUpdateStatus,
  animatingItems = new Set()
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

  // Grouper par entreprise par défaut
  const groupedOffers = sortedJobOffers.reduce((acc, offer) => {
    const companyName = offer.company_name || 'Entreprise non renseignée';
    if (!acc[companyName]) {
      acc[companyName] = [];
    }
    acc[companyName].push(offer);
    return acc;
  }, {} as Record<string, ClientJobOffer[]>);

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

  const handleArchiveAllForCompany = (companyOffers: ClientJobOffer[]) => {
    companyOffers.forEach(offer => {
      if (offer.status !== 'archivee') {
        onUpdateStatus(offer.id, 'archivee');
      }
    });
  };

  const handleStatusClick = (offer: ClientJobOffer, newStatus: string) => {
    onUpdateStatus(offer.id, newStatus);
  };

  const handleArchiveToggle = (offer: ClientJobOffer) => {
    // Si l'offre est archivée, on la désarchive vers 'non_attribuee'
    // Sinon on l'archive
    const newStatus = offer.status === 'archivee' ? 'non_attribuee' : 'archivee';
    onUpdateStatus(offer.id, newStatus);
  };

  const AssignmentSelector = ({ offer }: { offer: ClientJobOffer }) => {
    const assignedUser = getAssignedUser(offer.assigned_to_user_id);
    
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full h-10 justify-between bg-white border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 shadow-sm"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {assignedUser ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                  <UserPlus className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <span className="truncate text-sm font-medium text-blue-700">
                    {assignedUser.full_name || assignedUser.email}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-gray-300 rounded-full flex-shrink-0"></div>
                  <UserPlus className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="text-sm text-gray-500">Assigner à...</span>
                </>
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4">
            <div className="text-sm font-semibold text-gray-900 mb-3">
              Assigner à un collaborateur
            </div>
            
            <div className="space-y-1">
              <button
                onClick={() => onAssignJobOffer(offer.id, null)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-3 ${
                  !offer.assigned_to_user_id
                    ? 'bg-blue-100 text-blue-900 font-medium'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                <span>Non assigné</span>
                {!offer.assigned_to_user_id && <Check className="h-4 w-4 ml-auto text-blue-600" />}
              </button>
              
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => onAssignJobOffer(offer.id, user.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-3 ${
                    offer.assigned_to_user_id === user.id
                      ? 'bg-blue-100 text-blue-900 font-medium'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <User className="h-4 w-4 text-blue-600" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">
                      {user.full_name || user.email}
                    </div>
                    {user.full_name && user.email && (
                      <div className="text-xs text-gray-500 truncate">
                        {user.email}
                      </div>
                    )}
                  </div>
                  {offer.assigned_to_user_id === user.id && <Check className="h-4 w-4 text-blue-600" />}
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const StatusSelector = ({ offer }: { offer: ClientJobOffer }) => {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full h-10 justify-between bg-white border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 shadow-sm"
          >
            <Badge 
              variant="outline" 
              className={`text-xs font-medium border ${getStatusColor(offer.status)}`}
            >
              {offer.status === 'archivee' && (
                <ArchiveRestore className="h-3 w-3 mr-1" />
              )}
              {getStatusLabel(offer.status)}
            </Badge>
            <ChevronDown className="h-4 w-4 text-gray-500 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-4">
            <div className="text-sm font-semibold text-gray-900 mb-3">
              Changer le statut
            </div>
            
            <div className="space-y-1">
              {[
                { value: 'non_attribuee', label: 'Non attribuée' },
                { value: 'en_attente', label: 'En attente' },
                { value: 'a_relancer', label: 'À relancer' },
                { value: 'negatif', label: 'Négatif' },
                { value: 'positif', label: 'Positif' },
                { value: 'archivee', label: 'Archivée' }
              ].map((status) => (
                <button
                  key={status.value}
                  onClick={() => handleStatusClick(offer, status.value)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-3 ${
                    offer.status === status.value
                      ? 'bg-purple-100 text-purple-900 font-medium'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <Badge 
                    variant="outline" 
                    className={`text-xs font-medium border ${getStatusColor(status.value)}`}
                  >
                    {status.label}
                  </Badge>
                  {offer.status === status.value && <Check className="h-4 w-4 ml-auto text-purple-600" />}
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div className="space-y-4">
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
              <TableHead className="font-semibold text-gray-900 w-52">Statut</TableHead>
              <TableHead className="font-semibold text-gray-900 w-24">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedOffers).map(([companyName, offers]) => 
              offers.map((offer, index) => (
                <TableRow 
                  key={offer.id} 
                  className={`hover:bg-blue-50/50 transition-all duration-500 ease-out ${
                    animatingItems.has(offer.id) 
                      ? 'animate-[fadeOutSlideUp_0.8s_ease-out_forwards] opacity-100 transform translate-y-0' 
                      : 'opacity-100 transform translate-y-0'
                  }`}
                  style={{
                    animationDelay: animatingItems.has(offer.id) ? `${index * 100}ms` : '0ms'
                  }}
                >
                  {/* Entreprise - fusionnée visuellement pour le regroupement */}
                  <TableCell className="py-3">
                    {index === 0 ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            {companyName}
                          </div>
                          {offers.length > 1 && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {offers.length} offres
                            </Badge>
                          )}
                        </div>
                        {offers.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleArchiveAllForCompany(offers)}
                            className="h-8 px-2 text-red-600 hover:text-red-800 hover:bg-red-50"
                            title={`Archiver toutes les offres de ${companyName}`}
                          >
                            <ArchiveX className="h-4 w-4" />
                          </Button>
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

                  {/* Assignation avec nouvelle UX */}
                  <TableCell className="py-3">
                    <AssignmentSelector offer={offer} />
                    {offer.assigned_at && (
                      <div className="text-xs text-gray-400 mt-1">
                        {format(new Date(offer.assigned_at), 'dd/MM HH:mm', { locale: fr })}
                      </div>
                    )}
                  </TableCell>

                  {/* Statut avec nouvelle UX */}
                  <TableCell className="py-3">
                    <StatusSelector offer={offer} />
                  </TableCell>

                  {/* Action Archiver/Désarchiver */}
                  <TableCell className="py-3">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`h-8 w-8 p-0 transition-colors ${
                        offer.status === 'archivee' 
                          ? 'hover:bg-green-50 hover:text-green-600' 
                          : 'hover:bg-red-50 hover:text-red-600'
                      }`}
                      onClick={() => handleArchiveToggle(offer)}
                      title={offer.status === 'archivee' ? 'Désarchiver cette offre' : 'Archiver cette offre'}
                    >
                      {offer.status === 'archivee' ? (
                        <ArchiveRestore className="h-4 w-4" />
                      ) : (
                        <Archive className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
            
            {jobOffers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <Eye className="h-8 w-8 text-gray-300" />
                    <span>Aucune offre d'emploi trouvée</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <style jsx>{`
        @keyframes fadeOutSlideUp {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
            max-height: 200px;
          }
          50% {
            opacity: 0.3;
            transform: translateY(-10px) scale(0.98);
          }
          100% {
            opacity: 0;
            transform: translateY(-30px) scale(0.95);
            max-height: 0;
            padding-top: 0;
            padding-bottom: 0;
            margin-top: 0;
            margin-bottom: 0;
          }
        }
      `}</style>
    </div>
  );
}

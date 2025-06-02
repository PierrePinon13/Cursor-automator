
import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Calendar, Users, UserCheck, Tag, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CompactJobOffersFiltersProps {
  selectedDateFilter: string;
  setSelectedDateFilter: (filter: string) => void;
  selectedClientFilter: string;
  setSelectedClientFilter: (filter: string) => void;
  selectedAssignmentFilter: string;
  setSelectedAssignmentFilter: (filter: string) => void;
  selectedStatusFilter: string;
  setSelectedStatusFilter: (filter: string) => void;
  availableClients: Array<{ id: string; name: string }>;
  filteredJobOffers: any[];
  refreshJobOffers: () => void;
}

export function CompactJobOffersFilters({
  selectedDateFilter,
  setSelectedDateFilter,
  selectedClientFilter,
  setSelectedClientFilter,
  selectedAssignmentFilter,
  setSelectedAssignmentFilter,
  selectedStatusFilter,
  setSelectedStatusFilter,
  availableClients,
  filteredJobOffers,
  refreshJobOffers
}: CompactJobOffersFiltersProps) {
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'non_attribuee': return 'Non attribuée';
      case 'en_attente': return 'En attente';
      case 'a_relancer': return 'À relancer';
      case 'negatif': return 'Négatif';
      case 'positif': return 'Positif';
      case 'archivee': return 'Archivée';
      case 'active': return 'Actives';
      case 'archived': return 'Archivées';
      case 'all': return 'Tous les statuts';
      default: return status;
    }
  };

  const getFilterBadgeVariant = (filterType: string, value: string) => {
    if (filterType === 'date' && value !== 'all') return 'default';
    if (filterType === 'client' && value !== 'all') return 'secondary';
    if (filterType === 'assignment' && value !== 'all') return 'outline';
    if (filterType === 'status' && value === 'active') return 'default';
    return 'secondary';
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedDateFilter !== 'last_48_hours') count++;
    if (selectedClientFilter !== 'all') count++;
    if (selectedAssignmentFilter !== 'unassigned') count++;
    if (selectedStatusFilter !== 'active') count++;
    return count;
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
      {/* Header avec icône et titre */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 text-white p-2 rounded-lg">
            <Filter className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Filtres des offres</h3>
            <p className="text-sm text-gray-600">
              {getActiveFiltersCount() > 0 && (
                <span className="text-blue-600">
                  {getActiveFiltersCount()} filtre{getActiveFiltersCount() > 1 ? 's' : ''} actif{getActiveFiltersCount() > 1 ? 's' : ''}
                </span>
              )}
              {getActiveFiltersCount() === 0 && "Filtres par défaut actifs"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge 
            variant="outline" 
            className="bg-white border-blue-300 text-blue-700 font-semibold px-3 py-1"
          >
            {filteredJobOffers.length} offre{filteredJobOffers.length !== 1 ? 's' : ''}
          </Badge>
          <Button
            onClick={refreshJobOffers}
            variant="outline"
            size="sm"
            className="bg-white border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 transition-all duration-200"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Filtre de date */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Calendar className="h-4 w-4 text-blue-500" />
            Période
          </div>
          <Select value={selectedDateFilter} onValueChange={setSelectedDateFilter}>
            <SelectTrigger className="bg-white border-blue-200 hover:border-blue-300 focus:border-blue-500 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-blue-200">
              <SelectItem value="all">Toutes les dates</SelectItem>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="yesterday">Hier</SelectItem>
              <SelectItem value="last_48_hours">48 dernières heures</SelectItem>
              <SelectItem value="last_7_days">7 derniers jours</SelectItem>
              <SelectItem value="last_30_days">30 derniers jours</SelectItem>
            </SelectContent>
          </Select>
          {selectedDateFilter !== 'last_48_hours' && (
            <Badge variant={getFilterBadgeVariant('date', selectedDateFilter)} className="text-xs">
              Filtre modifié
            </Badge>
          )}
        </div>

        {/* Filtre client */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Users className="h-4 w-4 text-green-500" />
            Client
          </div>
          <Select value={selectedClientFilter} onValueChange={setSelectedClientFilter}>
            <SelectTrigger className="bg-white border-blue-200 hover:border-blue-300 focus:border-blue-500 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-blue-200">
              <SelectItem value="all">Tous les clients</SelectItem>
              {availableClients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedClientFilter !== 'all' && (
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
              Client spécifique
            </Badge>
          )}
        </div>

        {/* Filtre assignation */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <UserCheck className="h-4 w-4 text-orange-500" />
            Assignation
          </div>
          <Select value={selectedAssignmentFilter} onValueChange={setSelectedAssignmentFilter}>
            <SelectTrigger className="bg-white border-blue-200 hover:border-blue-300 focus:border-blue-500 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-blue-200">
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="assigned">Assignées</SelectItem>
              <SelectItem value="unassigned">Non assignées</SelectItem>
            </SelectContent>
          </Select>
          {selectedAssignmentFilter !== 'unassigned' && (
            <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
              Filtre modifié
            </Badge>
          )}
        </div>

        {/* Filtre statut */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Tag className="h-4 w-4 text-purple-500" />
            Statut
          </div>
          <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
            <SelectTrigger className="bg-white border-blue-200 hover:border-blue-300 focus:border-blue-500 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-blue-200">
              <SelectItem value="active">Actives</SelectItem>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="non_attribuee">Non attribuée</SelectItem>
              <SelectItem value="en_attente">En attente</SelectItem>
              <SelectItem value="a_relancer">À relancer</SelectItem>
              <SelectItem value="negatif">Négatif</SelectItem>
              <SelectItem value="positif">Positif</SelectItem>
              <SelectItem value="archived">Archivées</SelectItem>
            </SelectContent>
          </Select>
          <Badge 
            variant={selectedStatusFilter === 'active' ? 'default' : 'secondary'} 
            className={`text-xs ${selectedStatusFilter === 'active' ? 'bg-blue-500' : 'bg-purple-100 text-purple-700'}`}
          >
            {getStatusLabel(selectedStatusFilter)}
          </Badge>
        </div>
      </div>

      {/* Indicateur de filtres actifs */}
      {getActiveFiltersCount() > 0 && (
        <div className="mt-4 pt-4 border-t border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              Filtres personnalisés actifs
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedDateFilter('last_48_hours');
                setSelectedClientFilter('all');
                setSelectedAssignmentFilter('unassigned');
                setSelectedStatusFilter('active');
              }}
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
            >
              Réinitialiser
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Calendar, Users, UserCheck, Tag } from 'lucide-react';
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

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-lg border">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-gray-500" />
        <Select value={selectedDateFilter} onValueChange={setSelectedDateFilter}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les dates</SelectItem>
            <SelectItem value="today">Aujourd'hui</SelectItem>
            <SelectItem value="yesterday">Hier</SelectItem>
            <SelectItem value="last_48_hours">48 dernières heures</SelectItem>
            <SelectItem value="last_7_days">7 derniers jours</SelectItem>
            <SelectItem value="last_30_days">30 derniers jours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-gray-500" />
        <Select value={selectedClientFilter} onValueChange={setSelectedClientFilter}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les clients</SelectItem>
            {availableClients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <UserCheck className="h-4 w-4 text-gray-500" />
        <Select value={selectedAssignmentFilter} onValueChange={setSelectedAssignmentFilter}>
          <SelectTrigger className="w-[120px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="assigned">Assignées</SelectItem>
            <SelectItem value="unassigned">Non assignées</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-gray-500" />
        <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
          <SelectTrigger className="w-[120px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
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
      </div>

      <Button
        onClick={refreshJobOffers}
        variant="outline"
        size="sm"
        className="flex items-center gap-2 h-8"
      >
        <RefreshCw className="h-3 w-3" />
        Actualiser
      </Button>

      <div className="ml-auto">
        <Badge variant="secondary" className="text-xs">
          {filteredJobOffers.length} offre{filteredJobOffers.length !== 1 ? 's' : ''}
        </Badge>
      </div>
    </div>
  );
}

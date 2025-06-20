
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Building2, Users, CheckSquare } from 'lucide-react';
import { JobOffersRefreshButton } from './JobOffersRefreshButton';

interface VisualJobOffersFiltersProps {
  selectedDateFilter: string;
  setSelectedDateFilter: (value: string) => void;
  selectedClientFilter: string;
  setSelectedClientFilter: (value: string) => void;
  selectedAssignmentFilter: string;
  setSelectedAssignmentFilter: (value: string) => void;
  selectedStatusFilter: string;
  setSelectedStatusFilter: (value: string) => void;
  availableClients: Array<{ id: string; name: string | null }>;
  filteredJobOffers: any[];
  refreshJobOffers: () => void;
}

export function VisualJobOffersFilters({
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
}: VisualJobOffersFiltersProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          {/* Filtre par période */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Période</span>
            <Select value={selectedDateFilter} onValueChange={setSelectedDateFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_48_hours">48h</SelectItem>
                <SelectItem value="today">Aujourd'hui</SelectItem>
                <SelectItem value="yesterday">Hier</SelectItem>
                <SelectItem value="last_7_days">7 derniers jours</SelectItem>
                <SelectItem value="last_30_days">30 derniers jours</SelectItem>
                <SelectItem value="all">Toutes les dates</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtre par client */}
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Client</span>
            <Select value={selectedClientFilter} onValueChange={setSelectedClientFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les clients</SelectItem>
                {availableClients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name || 'Client sans nom'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtre par assignation */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium">Assignation</span>
            <Select value={selectedAssignmentFilter} onValueChange={setSelectedAssignmentFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Non assignées</SelectItem>
                <SelectItem value="assigned">Assignées</SelectItem>
                <SelectItem value="all">Toutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtre par statut */}
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">Statut</span>
            <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Actives</SelectItem>
                <SelectItem value="non_attribuee">Non attribuée</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
                <SelectItem value="a_relancer">À relancer</SelectItem>
                <SelectItem value="negatif">Négatif</SelectItem>
                <SelectItem value="positif">Positif</SelectItem>
                <SelectItem value="archived">Archivées</SelectItem>
                <SelectItem value="all">Tous les statuts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-blue-700 font-semibold">
            {filteredJobOffers.length} offre{filteredJobOffers.length !== 1 ? 's' : ''}
          </Badge>
          <JobOffersRefreshButton onRefresh={refreshJobOffers} />
        </div>
      </div>
    </div>
  );
}

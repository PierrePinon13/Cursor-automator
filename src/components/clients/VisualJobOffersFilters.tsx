
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Filter, Building2, Users, Calendar, CheckSquare } from 'lucide-react';
import { JobOffersRefreshButton } from './JobOffersRefreshButton';

interface VisualJobOffersFiltersProps {
  selectedDateFilter: string;
  setSelectedDateFilter: (value: string) => void;
  selectedClientFilter: string;
  setSelectedClientFilter: (value: string) => void;
  selectedAssignmentFilter: string;
  setSelectedAssignmentFilter: (value: string) => void;
  selectedStatusFilter: string[];
  setSelectedStatusFilter: (value: string[]) => void;
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
  const dateFilterOptions = [
    { value: 'today', label: "Aujourd'hui" },
    { value: 'yesterday', label: 'Hier' },
    { value: 'last_48_hours', label: 'Dernières 48h' },
    { value: 'last_7_days', label: '7 derniers jours' },
    { value: 'last_30_days', label: '30 derniers jours' },
    { value: 'all', label: 'Toutes les dates' }
  ];

  const assignmentFilterOptions = [
    { value: 'all', label: 'Toutes' },
    { value: 'assigned', label: 'Assignées' },
    { value: 'unassigned', label: 'Non assignées' }
  ];

  const statusFilterOptions = [
    { value: 'active', label: 'Actives' },
    { value: 'archived', label: 'Archivées' },
    { value: 'non_attribuee', label: 'Non attribuées' },
    { value: 'en_attente', label: 'En attente' },
    { value: 'en_cours', label: 'En cours' },
    { value: 'terminee', label: 'Terminées' }
  ];

  const handleStatusFilterToggle = (status: string) => {
    if (selectedStatusFilter.includes(status)) {
      setSelectedStatusFilter(selectedStatusFilter.filter(s => s !== status));
    } else {
      setSelectedStatusFilter([...selectedStatusFilter, status]);
    }
  };

  return (
    <Card className="bg-white border border-gray-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filtres des offres d'emploi</h3>
            <Badge variant="secondary" className="ml-2">
              {filteredJobOffers.length} offre{filteredJobOffers.length > 1 ? 's' : ''}
            </Badge>
          </div>
          <JobOffersRefreshButton onRefresh={refreshJobOffers} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Filtre par date */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <label className="text-sm font-medium text-gray-700">Date de publication</label>
            </div>
            <Select value={selectedDateFilter} onValueChange={setSelectedDateFilter}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dateFilterOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtre par client */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-500" />
              <label className="text-sm font-medium text-gray-700">Client</label>
            </div>
            <Select value={selectedClientFilter} onValueChange={setSelectedClientFilter}>
              <SelectTrigger className="w-full">
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
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <label className="text-sm font-medium text-gray-700">Assignation</label>
            </div>
            <Select value={selectedAssignmentFilter} onValueChange={setSelectedAssignmentFilter}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assignmentFilterOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtre par statut (multi-select) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-gray-500" />
              <label className="text-sm font-medium text-gray-700">Statuts</label>
            </div>
            <div className="flex flex-wrap gap-1">
              {statusFilterOptions.map(option => (
                <Badge
                  key={option.value}
                  variant={selectedStatusFilter.includes(option.value) ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => handleStatusFilterToggle(option.value)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

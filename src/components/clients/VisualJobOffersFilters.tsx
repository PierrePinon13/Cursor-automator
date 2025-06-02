
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Calendar, Users, UserCheck, Tag, Filter, X } from 'lucide-react';

interface VisualJobOffersFiltersProps {
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
  const dateOptions = [
    { value: 'all', label: 'Toutes les dates', icon: Calendar },
    { value: 'today', label: 'Aujourd\'hui', icon: Calendar },
    { value: 'yesterday', label: 'Hier', icon: Calendar },
    { value: 'last_48_hours', label: '48h', icon: Calendar },
    { value: 'last_7_days', label: '7 jours', icon: Calendar },
    { value: 'last_30_days', label: '30 jours', icon: Calendar },
  ];

  const assignmentOptions = [
    { value: 'all', label: 'Toutes', icon: UserCheck },
    { value: 'assigned', label: 'Assignées', icon: UserCheck },
    { value: 'unassigned', label: 'Non assignées', icon: UserCheck },
  ];

  const statusOptions = [
    { value: 'active', label: 'Actives', icon: Tag },
    { value: 'all', label: 'Tous', icon: Tag },
    { value: 'non_attribuee', label: 'Non attribuée', icon: Tag },
    { value: 'en_attente', label: 'En attente', icon: Tag },
    { value: 'a_relancer', label: 'À relancer', icon: Tag },
    { value: 'negatif', label: 'Négatif', icon: Tag },
    { value: 'positif', label: 'Positif', icon: Tag },
    { value: 'archived', label: 'Archivées', icon: Tag },
  ];

  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedDateFilter !== 'last_48_hours') count++;
    if (selectedClientFilter !== 'all') count++;
    if (selectedAssignmentFilter !== 'unassigned') count++;
    if (selectedStatusFilter !== 'active') count++;
    return count;
  };

  const resetFilters = () => {
    setSelectedDateFilter('last_48_hours');
    setSelectedClientFilter('all');
    setSelectedAssignmentFilter('unassigned');
    setSelectedStatusFilter('active');
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-3 rounded-xl shadow-lg">
            <Filter className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Filtres des offres d'emploi</h3>
            <p className="text-sm text-gray-600 mt-1">
              {getActiveFiltersCount() > 0 ? (
                <span className="text-blue-600 font-medium">
                  {getActiveFiltersCount()} filtre{getActiveFiltersCount() > 1 ? 's' : ''} personnalisé{getActiveFiltersCount() > 1 ? 's' : ''}
                </span>
              ) : (
                "Filtres par défaut actifs"
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge 
            variant="outline" 
            className="bg-white border-blue-300 text-blue-700 font-bold px-4 py-2 text-base shadow-sm"
          >
            {filteredJobOffers.length} offre{filteredJobOffers.length !== 1 ? 's' : ''}
          </Badge>
          <Button
            onClick={refreshJobOffers}
            variant="outline"
            size="sm"
            className="bg-white border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 shadow-sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Filtres visuels */}
      <div className="space-y-6">
        {/* Filtre de période */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-gray-800">Période de publication</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {dateOptions.map((option) => (
              <Button
                key={option.value}
                variant={selectedDateFilter === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDateFilter(option.value)}
                className={selectedDateFilter === option.value 
                  ? "bg-blue-600 text-white shadow-md border-0" 
                  : "bg-white border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300"
                }
              >
                <option.icon className="h-4 w-4 mr-2" />
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Filtre client */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-gray-800">Client</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedClientFilter === 'all' ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedClientFilter('all')}
              className={selectedClientFilter === 'all' 
                ? "bg-green-600 text-white shadow-md border-0" 
                : "bg-white border-gray-300 text-gray-700 hover:bg-green-50 hover:border-green-300"
              }
            >
              <Users className="h-4 w-4 mr-2" />
              Tous les clients
            </Button>
            {availableClients.map((client) => (
              <Button
                key={client.id}
                variant={selectedClientFilter === client.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedClientFilter(client.id)}
                className={selectedClientFilter === client.id 
                  ? "bg-green-600 text-white shadow-md border-0" 
                  : "bg-white border-gray-300 text-gray-700 hover:bg-green-50 hover:border-green-300"
                }
              >
                <Users className="h-4 w-4 mr-2" />
                {client.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Filtre assignation */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <UserCheck className="h-5 w-5 text-orange-600" />
            <span className="font-semibold text-gray-800">Assignation</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {assignmentOptions.map((option) => (
              <Button
                key={option.value}
                variant={selectedAssignmentFilter === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAssignmentFilter(option.value)}
                className={selectedAssignmentFilter === option.value 
                  ? "bg-orange-600 text-white shadow-md border-0" 
                  : "bg-white border-gray-300 text-gray-700 hover:bg-orange-50 hover:border-orange-300"
                }
              >
                <option.icon className="h-4 w-4 mr-2" />
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Filtre statut */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Tag className="h-5 w-5 text-purple-600" />
            <span className="font-semibold text-gray-800">Statut</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <Button
                key={option.value}
                variant={selectedStatusFilter === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatusFilter(option.value)}
                className={selectedStatusFilter === option.value 
                  ? "bg-purple-600 text-white shadow-md border-0" 
                  : "bg-white border-gray-300 text-gray-700 hover:bg-purple-50 hover:border-purple-300"
                }
              >
                <option.icon className="h-4 w-4 mr-2" />
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions et reset */}
      {getActiveFiltersCount() > 0 && (
        <div className="mt-6 pt-4 border-t border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="font-medium">Filtres personnalisés actifs</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 font-medium"
            >
              <X className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

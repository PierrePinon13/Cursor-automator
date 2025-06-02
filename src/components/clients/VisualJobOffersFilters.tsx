
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RefreshCw, Calendar, Users, UserCheck, Tag, X, ChevronDown, Check } from 'lucide-react';

interface VisualJobOffersFiltersProps {
  selectedDateFilter: string;
  setSelectedDateFilter: (filter: string) => void;
  selectedClientFilter: string;
  setSelectedClientFilter: (filter: string) => void;
  selectedAssignmentFilter: string;
  setSelectedAssignmentFilter: (filter: string) => void;
  selectedStatusFilter: string[];
  setSelectedStatusFilter: (filters: string[]) => void;
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
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);

  const dateOptions = [
    { value: 'all', label: 'Toutes les dates' },
    { value: 'today', label: 'Aujourd\'hui' },
    { value: 'yesterday', label: 'Hier' },
    { value: 'last_48_hours', label: '48h' },
    { value: 'last_7_days', label: '7 jours' },
    { value: 'last_30_days', label: '30 jours' },
  ];

  const assignmentOptions = [
    { value: 'all', label: 'Toutes' },
    { value: 'assigned', label: 'Assignées' },
    { value: 'unassigned', label: 'Non assignées' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Actives' },
    { value: 'all', label: 'Tous' },
    { value: 'non_attribuee', label: 'Non attribuée' },
    { value: 'en_attente', label: 'En attente' },
    { value: 'pre_assignee', label: 'Pré-assignée' },
    { value: 'a_relancer', label: 'À relancer' },
    { value: 'negatif', label: 'Négatif' },
    { value: 'positif', label: 'Positif' },
    { value: 'archived', label: 'Archivées' },
  ];

  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedDateFilter !== 'last_48_hours') count++;
    if (selectedClientFilter !== 'all') count++;
    if (selectedAssignmentFilter !== 'unassigned') count++;
    if (selectedStatusFilter.length !== 1 || selectedStatusFilter[0] !== 'active') count++;
    return count;
  };

  const resetFilters = () => {
    setSelectedDateFilter('last_48_hours');
    setSelectedClientFilter('all');
    setSelectedAssignmentFilter('unassigned');
    setSelectedStatusFilter(['active']);
  };

  const getFilterDisplayValue = (type: string, value: string | string[]) => {
    switch (type) {
      case 'date':
        return dateOptions.find(opt => opt.value === value)?.label || value;
      case 'assignment':
        return assignmentOptions.find(opt => opt.value === value)?.label || value;
      case 'status':
        const statusArray = Array.isArray(value) ? value : [value];
        if (statusArray.length === 1) {
          return statusOptions.find(opt => opt.value === statusArray[0])?.label || statusArray[0];
        }
        return `${statusArray.length} sélectionnés`;
      case 'client':
        if (value === 'all') return 'Tous les clients';
        return availableClients.find(client => client.id === value)?.name || value;
      default:
        return value;
    }
  };

  const isDefaultValue = (type: string, value: string | string[]) => {
    switch (type) {
      case 'date':
        return value === 'last_48_hours';
      case 'assignment':
        return value === 'unassigned';
      case 'status':
        const statusArray = Array.isArray(value) ? value : [value];
        return statusArray.length === 1 && statusArray[0] === 'active';
      case 'client':
        return value === 'all';
      default:
        return false;
    }
  };

  const handleStatusToggle = (statusValue: string) => {
    if (selectedStatusFilter.includes(statusValue)) {
      const newFilters = selectedStatusFilter.filter(s => s !== statusValue);
      setSelectedStatusFilter(newFilters.length > 0 ? newFilters : ['active']);
    } else {
      setSelectedStatusFilter([...selectedStatusFilter, statusValue]);
    }
  };

  const FilterButton = ({ 
    icon: Icon, 
    label, 
    value, 
    color, 
    options, 
    onSelect, 
    type,
    isMultiSelect = false
  }: {
    icon: any;
    label: string;
    value: string | string[];
    color: string;
    options: any[];
    onSelect: (value: string) => void;
    type: string;
    isMultiSelect?: boolean;
  }) => {
    const showLabel = isDefaultValue(type, value);
    
    return (
      <Popover 
        open={type === 'status' ? statusPopoverOpen : undefined}
        onOpenChange={type === 'status' ? setStatusPopoverOpen : undefined}
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`h-10 px-4 bg-white border-2 border-${color}-200 text-${color}-700 hover:bg-${color}-50 hover:border-${color}-300 transition-all duration-200 shadow-sm`}
          >
            <Icon className="h-4 w-4 mr-2" />
            {showLabel && <span className="font-medium mr-2">{label}</span>}
            <div className={`px-2 py-1 bg-${color}-100 text-${color}-800 rounded-md text-xs font-semibold`}>
              {getFilterDisplayValue(type, value)}
            </div>
            <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className={`w-80 p-0 ${type === 'client' ? 'h-80' : ''}`} align="start">
          <div className="p-4">
            <div className="text-sm font-semibold text-gray-900 mb-3">{label}</div>
            <div className={`space-y-1 ${type === 'client' ? 'max-h-64 overflow-y-auto' : ''}`}>
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    if (isMultiSelect && type === 'status') {
                      handleStatusToggle(option.value);
                    } else {
                      onSelect(option.value);
                    }
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-3 ${
                    (isMultiSelect && Array.isArray(value)) 
                      ? (value.includes(option.value)
                          ? `bg-${color}-100 text-${color}-900 font-medium`
                          : 'hover:bg-gray-100 text-gray-700')
                      : (value === option.value
                          ? `bg-${color}-100 text-${color}-900 font-medium`
                          : 'hover:bg-gray-100 text-gray-700')
                  }`}
                >
                  <span className="flex-1">{option.label}</span>
                  {isMultiSelect && Array.isArray(value) && value.includes(option.value) && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                  {!isMultiSelect && value === option.value && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-lg">
      <div className="flex flex-wrap items-center gap-3">
        <FilterButton
          icon={Calendar}
          label="Période"
          value={selectedDateFilter}
          color="blue"
          options={dateOptions}
          onSelect={setSelectedDateFilter}
          type="date"
        />

        <FilterButton
          icon={Users}
          label="Client"
          value={selectedClientFilter}
          color="green"
          options={[
            { value: 'all', label: 'Tous les clients' },
            ...availableClients.map(client => ({ value: client.id, label: client.name }))
          ]}
          onSelect={setSelectedClientFilter}
          type="client"
        />

        <FilterButton
          icon={UserCheck}
          label="Assignation"
          value={selectedAssignmentFilter}
          color="orange"
          options={assignmentOptions}
          onSelect={setSelectedAssignmentFilter}
          type="assignment"
        />

        <FilterButton
          icon={Tag}
          label="Statut"
          value={selectedStatusFilter}
          color="purple"
          options={statusOptions}
          onSelect={() => {}}
          type="status"
          isMultiSelect={true}
        />

        {getActiveFiltersCount() > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 font-medium"
          >
            <X className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
        )}

        <div className="flex items-center gap-3 ml-auto">
          <Badge 
            variant="outline" 
            className="bg-white border-blue-300 text-blue-700 font-bold px-3 py-1 text-sm shadow-sm"
          >
            {filteredJobOffers.length} offre{filteredJobOffers.length !== 1 ? 's' : ''}
          </Badge>
          <Button
            onClick={refreshJobOffers}
            variant="outline"
            size="sm"
            className="bg-white border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 shadow-sm h-8 w-8 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}


import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Calendar, Building, User, RefreshCw } from 'lucide-react';

interface CompactJobOffersFiltersProps {
  selectedDateFilter: string;
  setSelectedDateFilter: (filter: string) => void;
  selectedClientFilter: string;
  setSelectedClientFilter: (filter: string) => void;
  selectedAssignmentFilter: string;
  setSelectedAssignmentFilter: (filter: string) => void;
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
  availableClients,
  filteredJobOffers,
  refreshJobOffers
}: CompactJobOffersFiltersProps) {
  const getDateFilterLabel = (value: string) => {
    const labels = {
      'all': 'Toutes les périodes',
      'today': 'Aujourd\'hui',
      'yesterday': 'Hier',
      'last_7_days': '7 derniers jours',
      'last_30_days': '30 derniers jours'
    };
    return labels[value as keyof typeof labels] || value;
  };

  const getClientFilterLabel = (value: string) => {
    if (value === 'all') return 'Tous les clients';
    const client = availableClients.find(c => c.id === value);
    return client ? client.name : 'Client inconnu';
  };

  const getAssignmentFilterLabel = (value: string) => {
    const labels = {
      'all': 'Toutes',
      'assigned': 'Assignées',
      'unassigned': 'Non assignées'
    };
    return labels[value as keyof typeof labels] || value;
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {/* Filtre période */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Calendar className="h-4 w-4 mr-2" />
              {getDateFilterLabel(selectedDateFilter)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2">
            <div className="space-y-1">
              {[
                { value: 'all', label: 'Toutes les périodes' },
                { value: 'today', label: 'Aujourd\'hui' },
                { value: 'yesterday', label: 'Hier' },
                { value: 'last_7_days', label: '7 derniers jours' },
                { value: 'last_30_days', label: '30 derniers jours' }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={selectedDateFilter === option.value ? "default" : "ghost"}
                  size="sm"
                  className="w-full justify-start h-8"
                  onClick={() => setSelectedDateFilter(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Filtre client */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Building className="h-4 w-4 mr-2" />
              {getClientFilterLabel(selectedClientFilter)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2">
            <div className="space-y-1">
              <Button
                variant={selectedClientFilter === 'all' ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start h-8"
                onClick={() => setSelectedClientFilter('all')}
              >
                Tous les clients
              </Button>
              {availableClients.map((client) => (
                <Button
                  key={client.id}
                  variant={selectedClientFilter === client.id ? "default" : "ghost"}
                  size="sm"
                  className="w-full justify-start h-8"
                  onClick={() => setSelectedClientFilter(client.id)}
                >
                  {client.name}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Filtre assignation */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <User className="h-4 w-4 mr-2" />
              {getAssignmentFilterLabel(selectedAssignmentFilter)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-2">
            <div className="space-y-1">
              {[
                { value: 'all', label: 'Toutes' },
                { value: 'assigned', label: 'Assignées' },
                { value: 'unassigned', label: 'Non assignées' }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={selectedAssignmentFilter === option.value ? "default" : "ghost"}
                  size="sm"
                  className="w-full justify-start h-8"
                  onClick={() => setSelectedAssignmentFilter(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="h-6">
          {filteredJobOffers.length} offres
        </Badge>
        <Button
          onClick={refreshJobOffers}
          variant="outline"
          size="sm"
          className="h-8"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

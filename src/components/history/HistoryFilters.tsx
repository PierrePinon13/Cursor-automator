
import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { User, Linkedin, Phone, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HistoryFiltersProps {
  filterBy: 'all' | 'mine';
  onFilterByChange: (value: 'all' | 'mine') => void;
  activityTypes: string[];
  onActivityTypesChange: (types: string[]) => void;
  timeFilter: string;
  onTimeFilterChange: (value: string) => void;
  customDateRange?: { from?: Date; to?: Date };
  onCustomDateRangeChange: (range: { from?: Date; to?: Date }) => void;
  activitiesCount?: number;
}

const HistoryFilters = ({
  filterBy,
  onFilterByChange,
  activityTypes,
  onActivityTypesChange,
  timeFilter,
  onTimeFilterChange,
  activitiesCount = 0
}: HistoryFiltersProps) => {
  const handleActivityTypeToggle = (type: string) => {
    if (activityTypes.includes(type)) {
      onActivityTypesChange(activityTypes.filter(t => t !== type));
    } else {
      onActivityTypesChange([...activityTypes, type]);
    }
  };

  const handleTimeFilterClick = () => {
    // Cycle through time filters
    const timeFilters = ['all', 'today', 'this_week', 'this_month'];
    const currentIndex = timeFilters.indexOf(timeFilter);
    const nextIndex = (currentIndex + 1) % timeFilters.length;
    onTimeFilterChange(timeFilters[nextIndex]);
  };

  return (
    <div className="bg-white p-4 rounded-lg border space-y-4">
      {/* Compteur d'activités */}
      <div className="text-center text-sm text-gray-600 mb-4">
        {activitiesCount} activités sur la période
      </div>

      {/* Filtres avec boutons à icônes */}
      <div className="flex flex-col gap-3">
        {/* Filtre utilisateur */}
        <div className="flex justify-center">
          <button
            onClick={() => onFilterByChange(filterBy === 'all' ? 'mine' : 'all')}
            className={cn(
              'p-3 rounded-lg border-2 transition-colors flex items-center justify-center',
              filterBy === 'mine' 
                ? 'bg-blue-50 border-blue-500 text-blue-700' 
                : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
            )}
            title={filterBy === 'mine' ? 'Mes activités uniquement' : 'Toutes les activités'}
          >
            <User className="h-5 w-5" />
          </button>
        </div>

        {/* Filtres types d'activité */}
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => handleActivityTypeToggle('linkedin_message')}
            className={cn(
              'p-3 rounded-lg border-2 transition-colors flex items-center justify-center',
              activityTypes.includes('linkedin_message')
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
            )}
            title="Messages LinkedIn"
          >
            <Linkedin className="h-5 w-5" />
          </button>

          <button
            onClick={() => handleActivityTypeToggle('phone_call')}
            className={cn(
              'p-3 rounded-lg border-2 transition-colors flex items-center justify-center',
              activityTypes.includes('phone_call')
                ? 'bg-green-50 border-green-500 text-green-700'
                : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
            )}
            title="Appels téléphoniques"
          >
            <Phone className="h-5 w-5" />
          </button>
        </div>

        {/* Filtre temporel */}
        <div className="flex justify-center">
          <button
            onClick={handleTimeFilterClick}
            className={cn(
              'p-3 rounded-lg border-2 transition-colors flex items-center justify-center',
              timeFilter !== 'all'
                ? 'bg-orange-50 border-orange-500 text-orange-700'
                : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
            )}
            title={`Période: ${
              timeFilter === 'all' ? 'Toutes' :
              timeFilter === 'today' ? 'Aujourd\'hui' :
              timeFilter === 'this_week' ? 'Cette semaine' :
              timeFilter === 'this_month' ? 'Ce mois' : timeFilter
            }`}
          >
            <Clock className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryFilters;

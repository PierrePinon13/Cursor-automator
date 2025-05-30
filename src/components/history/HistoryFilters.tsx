
import React from 'react';
import { Button } from '@/components/ui/button';
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
  const handleUserFilterToggle = () => {
    onFilterByChange(filterBy === 'all' ? 'mine' : 'all');
  };

  const handleActivityTypeToggle = (type: string) => {
    if (activityTypes.includes(type)) {
      onActivityTypesChange(activityTypes.filter(t => t !== type));
    } else {
      onActivityTypesChange([...activityTypes, type]);
    }
  };

  const handleTimeFilterCycle = () => {
    const timeOptions = ['all', 'today', 'this_week', 'this_month'];
    const currentIndex = timeOptions.indexOf(timeFilter);
    const nextIndex = (currentIndex + 1) % timeOptions.length;
    onTimeFilterChange(timeOptions[nextIndex]);
  };

  return (
    <div className="flex items-center gap-1 mb-4">
      {/* Bouton utilisateur */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleUserFilterToggle}
        className={cn(
          'h-8 px-2 rounded-md border',
          filterBy === 'mine' 
            ? 'bg-blue-100 border-blue-300 text-blue-700' 
            : 'bg-white border-gray-300 text-gray-600'
        )}
      >
        <User className="h-4 w-4" />
      </Button>

      {/* Bouton LinkedIn */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleActivityTypeToggle('linkedin_message')}
        className={cn(
          'h-8 px-2 rounded-md border',
          activityTypes.includes('linkedin_message')
            ? 'bg-blue-100 border-blue-300 text-blue-700'
            : 'bg-white border-gray-300 text-gray-600'
        )}
      >
        <Linkedin className="h-4 w-4" />
      </Button>

      {/* Bouton téléphone */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleActivityTypeToggle('phone_call')}
        className={cn(
          'h-8 px-2 rounded-md border',
          activityTypes.includes('phone_call')
            ? 'bg-blue-100 border-blue-300 text-blue-700'
            : 'bg-white border-gray-300 text-gray-600'
        )}
      >
        <Phone className="h-4 w-4" />
      </Button>

      {/* Bouton période */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleTimeFilterCycle}
        className={cn(
          'h-8 px-2 rounded-md border',
          timeFilter !== 'all'
            ? 'bg-blue-100 border-blue-300 text-blue-700'
            : 'bg-white border-gray-300 text-gray-600'
        )}
      >
        <Clock className="h-4 w-4" />
      </Button>

      {/* Compteur d'activités */}
      <span className="text-sm text-gray-500 ml-4">
        {activitiesCount} activités sur la période
      </span>
    </div>
  );
};

export default HistoryFilters;

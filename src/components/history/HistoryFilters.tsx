
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Users, Linkedin, Phone, Clock } from 'lucide-react';
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
  const [showUserSelect, setShowUserSelect] = useState(false);

  const handleUserFilterClick = () => {
    onFilterByChange(filterBy === 'all' ? 'mine' : 'all');
  };

  const handleUserFilterDoubleClick = () => {
    if (filterBy === 'mine') {
      setShowUserSelect(true);
    }
  };

  const handleActivityTypeToggle = (type: string) => {
    if (activityTypes.includes(type)) {
      onActivityTypesChange(activityTypes.filter(t => t !== type));
    } else {
      onActivityTypesChange([...activityTypes, type]);
    }
  };

  return (
    <div className="space-y-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {/* Bouton utilisateur avec User/Users */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUserFilterClick}
              onDoubleClick={handleUserFilterDoubleClick}
              className={cn(
                'h-6 px-2 rounded-md border text-xs scale-75 origin-left',
                filterBy === 'mine' 
                  ? 'bg-blue-100 border-blue-300 text-blue-700' 
                  : 'bg-white border-gray-300 text-gray-600'
              )}
            >
              <div className="flex items-center gap-1">
                <User className={cn('h-3 w-3', filterBy === 'mine' ? 'text-blue-700' : 'text-gray-400')} />
                <Users className={cn('h-3 w-3', filterBy === 'all' ? 'text-blue-700' : 'text-gray-400')} />
              </div>
            </Button>
            
            {showUserSelect && (
              <div className="absolute top-full mt-1 z-50">
                <Select onValueChange={() => setShowUserSelect(false)}>
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <SelectValue placeholder="Choisir un utilisateur" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg">
                    <SelectItem value="current">Moi</SelectItem>
                    <SelectItem value="user1">Utilisateur 1</SelectItem>
                    <SelectItem value="user2">Utilisateur 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Bouton types d'activité avec LinkedIn/Phone */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleActivityTypeToggle('linkedin_message')}
              className={cn(
                'h-6 px-2 rounded-md border text-xs scale-75 origin-left',
                activityTypes.includes('linkedin_message')
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-600'
              )}
            >
              <Linkedin className={cn(
                'h-3 w-3',
                activityTypes.includes('linkedin_message') ? 'text-blue-700' : 'text-gray-400'
              )} />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleActivityTypeToggle('phone_call')}
              className={cn(
                'h-6 px-2 rounded-md border text-xs scale-75 origin-left',
                activityTypes.includes('phone_call')
                  ? 'bg-green-100 border-green-300 text-green-700'
                  : 'bg-white border-gray-300 text-gray-600'
              )}
            >
              <Phone className={cn(
                'h-3 w-3',
                activityTypes.includes('phone_call') ? 'text-green-700' : 'text-gray-400'
              )} />
            </Button>
          </div>

          {/* Bouton période - juste une horloge */}
          <Select value={timeFilter} onValueChange={onTimeFilterChange}>
            <SelectTrigger className={cn(
              'h-6 px-2 rounded-md border text-xs scale-75 origin-left w-auto flex items-center',
              timeFilter !== 'all'
                ? 'bg-blue-100 border-blue-300 text-blue-700'
                : 'bg-white border-gray-300 text-gray-600'
            )}>
              <Clock className="h-3 w-3" />
            </SelectTrigger>
            <SelectContent className="bg-white border shadow-lg">
              <SelectItem value="all">Toute période</SelectItem>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="this_week">Cette semaine</SelectItem>
              <SelectItem value="this_month">Ce mois</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Compteur d'activités - plus d'espace disponible */}
        <span className="text-xs text-gray-500 italic">
          {activitiesCount} activités sur la période
        </span>
      </div>
    </div>
  );
};

export default HistoryFilters;

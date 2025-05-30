
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { User, Linkedin, Phone, Clock, ChevronDown } from 'lucide-react';
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activityMenuOpen, setActivityMenuOpen] = useState(false);
  const [timeMenuOpen, setTimeMenuOpen] = useState(false);

  const timeFilterOptions = [
    { value: '1h', label: '1h' },
    { value: 'today', label: "Aujourd'hui" },
    { value: 'yesterday', label: 'Hier' },
    { value: 'this_week', label: 'Cette semaine' },
    { value: 'last_week', label: 'Semaine dernière' },
    { value: 'this_month', label: 'Ce mois-ci' },
    { value: 'last_month', label: 'Mois dernier' },
    { value: 'all', label: 'Toutes' }
  ];

  const getCurrentTimeLabel = () => {
    const option = timeFilterOptions.find(opt => opt.value === timeFilter);
    return option ? option.label : 'Toutes';
  };

  const handleUserFilterClick = () => {
    onFilterByChange(filterBy === 'all' ? 'mine' : 'all');
    setUserMenuOpen(false);
  };

  const handleActivityTypeToggle = (type: string) => {
    if (activityTypes.includes(type)) {
      onActivityTypesChange(activityTypes.filter(t => t !== type));
    } else {
      onActivityTypesChange([...activityTypes, type]);
    }
  };

  return (
    <div className="flex items-center gap-2 mb-4">
      {/* Bouton utilisateur */}
      <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'h-10 px-3 border-2 flex items-center gap-2',
              filterBy === 'mine' 
                ? 'bg-blue-50 border-blue-500 text-blue-700' 
                : 'bg-white border-gray-300 text-gray-700'
            )}
          >
            <User className="h-4 w-4" />
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="start">
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start text-sm',
              filterBy === 'all' && 'bg-gray-100'
            )}
            onClick={() => {
              onFilterByChange('all');
              setUserMenuOpen(false);
            }}
          >
            Toutes les activités
          </Button>
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start text-sm',
              filterBy === 'mine' && 'bg-gray-100'
            )}
            onClick={() => {
              onFilterByChange('mine');
              setUserMenuOpen(false);
            }}
          >
            Mes activités
          </Button>
        </PopoverContent>
      </Popover>

      {/* Bouton types d'activité */}
      <Popover open={activityMenuOpen} onOpenChange={setActivityMenuOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'h-10 px-3 border-2 flex items-center gap-2',
              (activityTypes.includes('linkedin_message') || activityTypes.includes('phone_call'))
                ? 'bg-blue-50 border-blue-500 text-blue-700' 
                : 'bg-white border-gray-300 text-gray-700'
            )}
          >
            <div className="flex items-center gap-1">
              {activityTypes.includes('linkedin_message') && (
                <Linkedin className="h-4 w-4" />
              )}
              {activityTypes.includes('phone_call') && (
                <Phone className="h-4 w-4" />
              )}
              {!activityTypes.includes('linkedin_message') && !activityTypes.includes('phone_call') && (
                <>
                  <Linkedin className="h-4 w-4" />
                  <Phone className="h-4 w-4" />
                </>
              )}
            </div>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="start">
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start text-sm flex items-center gap-2',
              activityTypes.includes('linkedin_message') && 'bg-blue-50'
            )}
            onClick={() => handleActivityTypeToggle('linkedin_message')}
          >
            <Linkedin className="h-4 w-4" />
            Messages LinkedIn
          </Button>
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start text-sm flex items-center gap-2',
              activityTypes.includes('phone_call') && 'bg-blue-50'
            )}
            onClick={() => handleActivityTypeToggle('phone_call')}
          >
            <Phone className="h-4 w-4" />
            Appels téléphone
          </Button>
        </PopoverContent>
      </Popover>

      {/* Bouton période */}
      <Popover open={timeMenuOpen} onOpenChange={setTimeMenuOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'h-10 px-3 border-2 flex items-center gap-2',
              timeFilter !== 'all'
                ? 'bg-orange-50 border-orange-500 text-orange-700'
                : 'bg-white border-gray-300 text-gray-700'
            )}
          >
            <Clock className="h-4 w-4" />
            <span className="text-sm">{getCurrentTimeLabel()}</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="start">
          {timeFilterOptions.map((option) => (
            <Button
              key={option.value}
              variant="ghost"
              className={cn(
                'w-full justify-start text-sm',
                timeFilter === option.value && 'bg-gray-100'
              )}
              onClick={() => {
                onTimeFilterChange(option.value);
                setTimeMenuOpen(false);
              }}
            >
              {option.label}
            </Button>
          ))}
        </PopoverContent>
      </Popover>

      {/* Compteur d'activités */}
      <span className="text-sm text-gray-600 ml-4">
        {activitiesCount} activités sur la période
      </span>
    </div>
  );
};

export default HistoryFilters;

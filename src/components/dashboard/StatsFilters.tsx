
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TimeFilter, ViewType } from '@/hooks/useUserStats';

interface StatsFiltersProps {
  viewType: ViewType;
  timeFilter: TimeFilter;
  onViewTypeChange: (value: ViewType) => void;
  onTimeFilterChange: (value: TimeFilter) => void;
}

const StatsFilters = ({
  viewType,
  timeFilter,
  onViewTypeChange,
  onTimeFilterChange,
}: StatsFiltersProps) => {
  const [timeMenuOpen, setTimeMenuOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});

  const viewTypeOptions = [
    { value: 'personal' as ViewType, label: 'Mes stats', icon: Users },
    { value: 'global' as ViewType, label: 'Global', icon: Users },
    { value: 'comparison' as ViewType, label: 'Par collaborateur', icon: Users },
  ];

  const timeFilterOptions = [
    { value: 'today', label: "Aujourd'hui" },
    { value: 'this-week', label: 'Cette semaine' },
    { value: 'last-week', label: 'Semaine dernière' },
    { value: 'this-month', label: 'Ce mois' },
    { value: 'last-month', label: 'Mois dernier' },
    { value: 'all-time', label: 'Tout' },
    { value: 'custom', label: 'Période personnalisée' }
  ];

  const handleTimeFilterSelect = (value: string) => {
    if (value === 'custom') {
      setShowCalendar(true);
    } else {
      onTimeFilterChange(value as TimeFilter);
      setTimeMenuOpen(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    if (!customDateRange?.from || customDateRange.to) {
      setCustomDateRange({ from: date, to: undefined });
    } else {
      const newRange = { 
        from: customDateRange.from, 
        to: date.getTime() >= customDateRange.from.getTime() ? date : customDateRange.from 
      };
      if (date.getTime() < customDateRange.from.getTime()) {
        newRange.from = date;
        newRange.to = customDateRange.from;
      }
      setCustomDateRange(newRange);
      onTimeFilterChange('custom' as TimeFilter);
      setShowCalendar(false);
      setTimeMenuOpen(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Filtre de période */}
          <Popover open={timeMenuOpen} onOpenChange={setTimeMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'h-8 px-3 rounded-md border text-sm',
                  timeFilter !== 'all-time'
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-600'
                )}
              >
                <Clock className="h-4 w-4 mr-2" />
                {timeFilterOptions.find(opt => opt.value === timeFilter)?.label || 'Période'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50" align="start">
              <div className="bg-white border rounded-lg shadow-lg">
                {!showCalendar ? (
                  <div className="p-2">
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {timeFilterOptions.slice(0, 6).map((option) => (
                        <Button
                          key={option.value}
                          variant={timeFilter === option.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleTimeFilterSelect(option.value)}
                          className="h-8 text-xs"
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTimeFilterSelect('custom')}
                      className="w-full h-8 text-xs"
                    >
                      Période personnalisée
                    </Button>
                  </div>
                ) : (
                  <div className="p-3">
                    <Calendar
                      mode="single"
                      selected={customDateRange?.from}
                      onSelect={handleDateSelect}
                      initialFocus
                      locale={fr}
                      className="rounded-md border-0"
                    />
                    <div className="mt-3 text-xs text-gray-500 text-center">
                      {!customDateRange?.from && "Cliquez une fois pour une date, deux fois pour une période"}
                      {customDateRange?.from && !customDateRange.to && 
                        `Début: ${format(customDateRange.from, 'dd/MM/yyyy', { locale: fr })} - Sélectionnez la fin`
                      }
                      {customDateRange?.from && customDateRange.to && 
                        `Du ${format(customDateRange.from, 'dd/MM/yyyy', { locale: fr })} au ${format(customDateRange.to, 'dd/MM/yyyy', { locale: fr })}`
                      }
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowCalendar(false);
                          setCustomDateRange({});
                        }}
                        className="flex-1 h-8 text-xs"
                      >
                        Annuler
                      </Button>
                      {customDateRange?.from && (
                        <Button
                          size="sm"
                          onClick={() => {
                            onTimeFilterChange('custom' as TimeFilter);
                            setShowCalendar(false);
                            setTimeMenuOpen(false);
                          }}
                          className="flex-1 h-8 text-xs"
                        >
                          Valider
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {/* Types de vue sous forme de badges */}
      <div className="flex flex-wrap gap-1.5">
        {viewTypeOptions.map((option) => {
          const isSelected = viewType === option.value;
          return (
            <Badge
              key={option.value}
              variant="outline"
              className={cn(
                'text-xs px-2 py-0.5 h-6 cursor-pointer transition-colors border',
                isSelected
                  ? 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-150'
                  : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-150'
              )}
              onClick={() => onViewTypeChange(option.value)}
            >
              {option.label}
            </Badge>
          );
        })}
      </div>
    </div>
  );
};

export default StatsFilters;

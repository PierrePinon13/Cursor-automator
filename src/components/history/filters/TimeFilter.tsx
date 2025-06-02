
import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, CalendarDays } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TimeFilterProps {
  timeFilter: string;
  onTimeFilterChange: (value: string) => void;
  customDateRange?: { from?: Date; to?: Date };
  onCustomDateRangeChange: (range: { from?: Date; to?: Date }) => void;
}

const TimeFilter = ({ 
  timeFilter, 
  onTimeFilterChange, 
  customDateRange,
  onCustomDateRangeChange 
}: TimeFilterProps) => {
  const timeOptions = [
    { value: 'all', label: 'Tout' },
    { value: 'today', label: 'Aujourd\'hui' },
    { value: 'this-week', label: 'Cette semaine' },
    { value: 'this-month', label: 'Ce mois' },
    { value: 'custom', label: 'Personnalisé' }
  ];

  const handleTimeFilterClick = (value: string) => {
    onTimeFilterChange(value);
  };

  return (
    <div className="flex items-center gap-0.5">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-6 px-2 border text-xs rounded-md',
              timeFilter !== 'all' 
                ? 'bg-purple-100 border-purple-300 text-purple-700' 
                : 'bg-white border-gray-300 text-gray-600'
            )}
          >
            <Calendar className={cn('h-3 w-3', timeFilter !== 'all' ? 'text-purple-700' : 'text-gray-400')} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="space-y-1">
            {timeOptions.map((option) => (
              <Button
                key={option.value}
                variant="ghost"
                size="sm"
                onClick={() => handleTimeFilterClick(option.value)}
                className={cn(
                  'w-full justify-start text-xs',
                  timeFilter === option.value ? 'bg-purple-100 text-purple-900' : ''
                )}
              >
                {option.label}
              </Button>
            ))}
          </div>
          
          {timeFilter === 'custom' && (
            <>
              <div className="border-t mt-2 pt-2">
                <div className="text-xs font-medium mb-2">Période personnalisée</div>
                <CalendarComponent
                  mode="range"
                  selected={{ from: customDateRange?.from, to: customDateRange?.to }}
                  onSelect={(range) => {
                    onCustomDateRangeChange({
                      from: range?.from,
                      to: range?.to
                    });
                  }}
                  locale={fr}
                  className="rounded-md border"
                />
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default TimeFilter;

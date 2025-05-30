
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  const [timeMenuOpen, setTimeMenuOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectingDateRange, setSelectingDateRange] = useState(false);

  const timeFilterOptions = [
    { value: '1h', label: '1h' },
    { value: 'today', label: "Aujourd'hui" },
    { value: 'yesterday', label: 'Hier' },
    { value: 'this_week', label: 'Cette semaine' },
    { value: 'last_week', label: 'Semaine dernière' },
    { value: 'this_month', label: 'Ce mois-ci' },
    { value: 'last_month', label: 'Mois dernier' },
    { value: 'custom', label: 'Période personnalisée' }
  ];

  const handleTimeFilterSelect = (value: string) => {
    if (value === 'custom') {
      setSelectingDateRange(true);
      setShowCalendar(true);
    } else {
      onTimeFilterChange(value);
      setTimeMenuOpen(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    if (!customDateRange?.from || customDateRange.to) {
      // Première date sélectionnée
      onCustomDateRangeChange({ from: date, to: undefined });
    } else {
      // Deuxième date sélectionnée
      const newRange = { 
        from: customDateRange.from, 
        to: date.getTime() >= customDateRange.from.getTime() ? date : customDateRange.from 
      };
      if (date.getTime() < customDateRange.from.getTime()) {
        newRange.from = date;
        newRange.to = customDateRange.from;
      }
      onCustomDateRangeChange(newRange);
      onTimeFilterChange('custom');
      setShowCalendar(false);
      setSelectingDateRange(false);
      setTimeMenuOpen(false);
    }
  };

  return (
    <Popover open={timeMenuOpen} onOpenChange={setTimeMenuOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-6 px-2 rounded-md border text-xs',
            timeFilter !== 'all'
              ? 'bg-blue-100 border-blue-300 text-blue-700'
              : 'bg-white border-gray-300 text-gray-600'
          )}
        >
          <Clock className={cn(
            'h-3 w-3',
            timeFilter !== 'all' ? 'text-blue-700' : 'text-gray-400'
          )} />
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
                    setSelectingDateRange(false);
                    onCustomDateRangeChange({});
                  }}
                  className="flex-1 h-8 text-xs"
                >
                  Annuler
                </Button>
                {customDateRange?.from && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onTimeFilterChange('custom');
                      setShowCalendar(false);
                      setSelectingDateRange(false);
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
  );
};

export default TimeFilter;

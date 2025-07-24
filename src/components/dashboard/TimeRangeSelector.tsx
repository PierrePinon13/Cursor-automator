
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TimeRange } from '@/hooks/useDashboardStats';

interface TimeRangeSelectorProps {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  lastEvolutionDate?: string; // nouvelle prop pour la date du dernier point
}

const PRESET_RANGES = () => ([
  {
    label: "Aujourd'hui",
    getValue: () => {
      const now = new Date();
      // Minuit local
      const startLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      // 23:59:59.999 local
      const endLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      // Décalage en minutes
      const tzOffset = startLocal.getTimezoneOffset();
      // Convertir en UTC
      const startUTC = new Date(startLocal.getTime() - tzOffset * 60000);
      const endUTC = new Date(endLocal.getTime() - tzOffset * 60000);
      return { start: startUTC, end: endUTC, label: "Aujourd'hui" };
    },
  },
  {
    label: 'Cette semaine',
    getValue: () => {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay() + 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start, end, label: 'Cette semaine' };
    },
  },
  {
    label: 'Ce mois',
    getValue: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start, end, label: 'Ce mois' };
    },
  },
  {
    label: 'Semaine dernière',
    getValue: () => {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay() - 6);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start, end, label: 'Semaine dernière' };
    },
  },
  {
    label: 'Mois dernier',
    getValue: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start, end, label: 'Mois dernier' };
    },
  },
]);

export function TimeRangeSelector({ timeRange, onTimeRangeChange, lastEvolutionDate }: TimeRangeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [customRange, setCustomRange] = useState<{from?: Date; to?: Date}>({});
  const [showCalendar, setShowCalendar] = useState(false);

  const handlePresetSelect = (preset: ReturnType<typeof PRESET_RANGES>[0]) => {
    onTimeRangeChange(preset.getValue());
    setOpen(false);
  };

  const handleCustomRange = () => {
    setShowCalendar(true);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    if (!customRange.from || customRange.to) {
      setCustomRange({ from: date, to: undefined });
    } else {
      const from = customRange.from;
      const to = date.getTime() >= from.getTime() ? date : from;
      const actualFrom = date.getTime() < from.getTime() ? date : from;
      
      const range: TimeRange = {
        start: actualFrom,
        end: to,
        label: `Du ${format(actualFrom, 'dd/MM', { locale: fr })} au ${format(to, 'dd/MM', { locale: fr })}`,
      };
      
      onTimeRangeChange(range);
      setCustomRange({});
      setShowCalendar(false);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start">
          <Clock className="mr-2 h-4 w-4" />
          {timeRange.label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {!showCalendar ? (
          <div className="p-4 space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground mb-3">
              Périodes prédéfinies
            </h4>
            <div className="grid gap-2">
              {PRESET_RANGES().map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="justify-start h-8"
                  onClick={() => handlePresetSelect(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4"
              onClick={handleCustomRange}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              Période personnalisée
            </Button>
          </div>
        ) : (
          <div className="p-3">
            <Calendar
              mode="single"
              selected={customRange.from}
              onSelect={handleDateSelect}
              locale={fr}
              className="rounded-md border-0"
            />
            <div className="mt-3 text-xs text-center text-muted-foreground">
              {!customRange.from && "Sélectionnez la date de début"}
              {customRange.from && !customRange.to && 
                `Début: ${format(customRange.from, 'dd/MM/yyyy', { locale: fr })} - Sélectionnez la fin`
              }
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCalendar(false);
                  setCustomRange({});
                }}
                className="flex-1"
              >
                Retour
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

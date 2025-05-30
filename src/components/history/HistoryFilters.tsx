
import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
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
}

const HistoryFilters = ({
  filterBy,
  onFilterByChange,
  activityTypes,
  onActivityTypesChange,
  timeFilter,
  onTimeFilterChange,
  customDateRange,
  onCustomDateRangeChange
}: HistoryFiltersProps) => {
  const handleActivityTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      onActivityTypesChange([...activityTypes, type]);
    } else {
      onActivityTypesChange(activityTypes.filter(t => t !== type));
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg border mb-4 space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="h-4 w-4" />
        <h3 className="font-medium">Filtres</h3>
      </div>

      {/* Filtre par utilisateur */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Affichage</label>
        <Select value={filterBy} onValueChange={onFilterByChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les activités</SelectItem>
            <SelectItem value="mine">Mes activités uniquement</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filtre par type d'activité */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Types d'activité</label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="linkedin_message"
              checked={activityTypes.includes('linkedin_message')}
              onCheckedChange={(checked) => handleActivityTypeChange('linkedin_message', checked as boolean)}
            />
            <label htmlFor="linkedin_message" className="text-sm">Messages LinkedIn</label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="phone_call"
              checked={activityTypes.includes('phone_call')}
              onCheckedChange={(checked) => handleActivityTypeChange('phone_call', checked as boolean)}
            />
            <label htmlFor="phone_call" className="text-sm">Appels téléphoniques</label>
          </div>
        </div>
      </div>

      {/* Filtre temporel */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Période</label>
        <Select value={timeFilter} onValueChange={onTimeFilterChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les périodes</SelectItem>
            <SelectItem value="1h">Dernière heure</SelectItem>
            <SelectItem value="today">Aujourd'hui</SelectItem>
            <SelectItem value="yesterday">Hier</SelectItem>
            <SelectItem value="this_week">Cette semaine</SelectItem>
            <SelectItem value="last_week">Semaine dernière</SelectItem>
            <SelectItem value="this_month">Ce mois</SelectItem>
            <SelectItem value="last_month">Mois dernier</SelectItem>
            <SelectItem value="custom">Période personnalisée</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sélecteur de dates personnalisé */}
      {timeFilter === 'custom' && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Dates personnalisées</label>
          <div className="flex flex-col gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customDateRange?.from ? (
                    format(customDateRange.from, "PPP", { locale: fr })
                  ) : (
                    "Date de début"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customDateRange?.from}
                  onSelect={(date) => onCustomDateRangeChange({ ...customDateRange, from: date })}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customDateRange?.to ? (
                    format(customDateRange.to, "PPP", { locale: fr })
                  ) : (
                    "Date de fin"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customDateRange?.to}
                  onSelect={(date) => onCustomDateRangeChange({ ...customDateRange, to: date })}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryFilters;

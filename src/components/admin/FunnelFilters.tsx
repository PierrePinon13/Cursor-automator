
import React from 'react';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface FunnelFiltersProps {
  timeFilter: string;
  onTimeFilterChange: (filter: string) => void;
}

const FunnelFilters = ({ timeFilter, onTimeFilterChange }: FunnelFiltersProps) => {
  const timeOptions = [
    { value: 'last-hour', label: 'Dernière heure' },
    { value: 'today', label: "Aujourd'hui" },
    { value: 'yesterday', label: 'Hier' },
    { value: 'this-week', label: 'Cette semaine' },
    { value: 'last-week', label: 'Semaine dernière' },
    { value: 'this-month', label: 'Ce mois' },
  ];

  return (
    <div className="flex items-center gap-2 mb-6">
      <Clock className="h-4 w-4 text-gray-500" />
      <span className="text-sm font-medium text-gray-700">Période:</span>
      <div className="flex gap-2">
        {timeOptions.map((option) => (
          <Button
            key={option.value}
            variant={timeFilter === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => onTimeFilterChange(option.value)}
            className="text-xs"
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default FunnelFilters;

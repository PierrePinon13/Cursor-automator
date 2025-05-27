
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <div className="space-y-2">
        <label className="text-sm font-medium">Vue</label>
        <ToggleGroup
          type="single"
          value={viewType}
          onValueChange={onViewTypeChange}
          className="justify-start"
        >
          <ToggleGroupItem value="personal" className="text-xs">
            Mes stats
          </ToggleGroupItem>
          <ToggleGroupItem value="global" className="text-xs">
            Global
          </ToggleGroupItem>
          <ToggleGroupItem value="comparison" className="text-xs">
            Par collaborateur
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Période</label>
        <Select value={timeFilter} onValueChange={onTimeFilterChange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Aujourd'hui</SelectItem>
            <SelectItem value="this-week">Cette semaine</SelectItem>
            <SelectItem value="last-week">Semaine dernière</SelectItem>
            <SelectItem value="this-month">Ce mois</SelectItem>
            <SelectItem value="last-month">Mois dernier</SelectItem>
            <SelectItem value="all-time">Tout</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default StatsFilters;

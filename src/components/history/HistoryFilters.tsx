import React from 'react';
import UserFilter from './filters/UserFilter';
import ActivityTypeFilter from './filters/ActivityTypeFilter';
import TimeFilter from './filters/TimeFilter';
import SearchFilter from './filters/SearchFilter';

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
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
}

const HistoryFilters = ({
  filterBy,
  onFilterByChange,
  activityTypes,
  onActivityTypesChange,
  timeFilter,
  onTimeFilterChange,
  customDateRange,
  onCustomDateRangeChange,
  activitiesCount = 0,
  searchQuery = '',
  onSearchQueryChange
}: HistoryFiltersProps) => {
  return (
    <div className="space-y-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          <UserFilter 
            filterBy={filterBy}
            onFilterByChange={onFilterByChange}
          />

          <ActivityTypeFilter 
            activityTypes={activityTypes}
            onActivityTypesChange={onActivityTypesChange}
          />

          <TimeFilter 
            timeFilter={timeFilter}
            onTimeFilterChange={onTimeFilterChange}
            customDateRange={customDateRange}
            onCustomDateRangeChange={onCustomDateRangeChange}
          />
        </div>

        {/* Compteur d'activités */}
        <span className="text-xs text-gray-500 italic">
          {activitiesCount} activités sur la période
        </span>
      </div>

      {/* Barre de recherche */}
      {onSearchQueryChange && (
        <SearchFilter 
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
        />
      )}
    </div>
  );
};

export default HistoryFilters;


import React, { useState } from 'react';
import ActivityList from '@/components/history/ActivityList';
import ActivityDetail from '@/components/history/ActivityDetail';
import HistoryFilters from '@/components/history/HistoryFilters';
import { SidebarTrigger } from '@/components/ui/sidebar';
import UserActionsDropdown from '@/components/UserActionsDropdown';
import { useHistoryWithFilters } from '@/hooks/useHistoryWithFilters';

const History = () => {
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [filterBy, setFilterBy] = useState<'all' | 'mine'>('all');
  const [activityTypes, setActivityTypes] = useState<string[]>(['linkedin_message', 'phone_call']);
  const [timeFilter, setTimeFilter] = useState('this-week');
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Utiliser le nouveau hook avec filtres
  const { activities, loading, refreshHistory } = useHistoryWithFilters({
    activityTypes,
    timeFilter,
    searchQuery,
    limit: 100
  });

  const handleSelectActivity = (activity: any) => {
    setSelectedActivity(activity);
  };

  console.log('📊 History - State:', {
    loading,
    activitiesCount: activities.length,
    filters: { filterBy, activityTypes, timeFilter, searchQuery }
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header minimal avec juste les boutons de navigation */}
      <div className="flex items-center justify-between px-3 py-2 bg-white">
        <SidebarTrigger />
        <UserActionsDropdown />
      </div>

      <div className="flex h-[calc(100vh-48px)]">
        {/* Colonne de gauche : Fil d'actualité avec filtres - 25% de largeur */}
        <div className="w-1/4 bg-white border-r flex flex-col">
          <div className="p-2 border-b">
            <HistoryFilters
              filterBy={filterBy}
              onFilterByChange={setFilterBy}
              activityTypes={activityTypes}
              onActivityTypesChange={setActivityTypes}
              timeFilter={timeFilter}
              onTimeFilterChange={setTimeFilter}
              customDateRange={customDateRange}
              onCustomDateRangeChange={setCustomDateRange}
              activitiesCount={activities.length}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
            />
          </div>
          
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-8 min-h-[200px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Chargement des activités...</p>
                </div>
              </div>
            ) : (
              <ActivityList 
                activities={activities}
                selectedActivity={selectedActivity}
                onSelectActivity={handleSelectActivity}
              />
            )}
          </div>
        </div>

        {/* Colonne de droite : Détail de l'activité - 75% de largeur */}
        <div className="w-3/4 bg-white">
          {selectedActivity ? (
            <ActivityDetail activity={selectedActivity} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg">Sélectionnez une activité pour voir les détails</p>
                {!loading && (
                  <p className="text-sm mt-2">
                    {activities.length} activité{activities.length > 1 ? 's' : ''} disponible{activities.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;

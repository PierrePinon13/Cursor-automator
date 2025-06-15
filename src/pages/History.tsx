
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

  // Utiliser le hook avec tous les filtres
  const { activities, loading, refreshHistory } = useHistoryWithFilters({
    activityTypes,
    timeFilter,
    searchQuery,
    filterBy,
    customDateRange,
    limit: 100
  });

  const handleSelectActivity = (activity: any) => {
    setSelectedActivity(activity);
  };

  console.log('📊 History - State:', {
    loading,
    activitiesCount: activities.length,
    filters: { filterBy, activityTypes, timeFilter, searchQuery, customDateRange }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Header modernisé avec gradient subtil */}
      <div className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-gray-200/60 shadow-sm">
        <SidebarTrigger />
        <UserActionsDropdown />
      </div>

      <div className="flex h-[calc(100vh-64px)]">
        {/* Colonne de gauche : Fil d'actualité avec filtres - Style modernisé */}
        <div className="w-1/4 bg-white/60 backdrop-blur-sm border-r border-gray-200/60 flex flex-col shadow-sm">
          <div className="p-4 border-b border-gray-200/60 bg-gradient-to-r from-slate-50/80 to-gray-50/80">
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                  <p className="text-sm text-gray-600 font-medium">Chargement des activités...</p>
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

        {/* Colonne de droite : Détail de l'activité - Style harmonisé */}
        <div className="w-3/4 bg-white/40 backdrop-blur-sm">
          {selectedActivity ? (
            <ActivityDetail activity={selectedActivity} />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center bg-white/60 backdrop-blur-sm rounded-xl p-8 shadow-sm border border-gray-200/60">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-8 h-8 bg-blue-200 rounded-full"></div>
                </div>
                <p className="text-lg font-semibold text-gray-900 mb-2">Sélectionnez une activité pour voir les détails</p>
                {!loading && (
                  <p className="text-sm text-gray-600">
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
